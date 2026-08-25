// supabase/functions/_shared/DraftGraph.ts
import { StateGraph, START, END } from "npm:@langchain/langgraph@latest"; 
import { ChatOpenAI } from "npm:@langchain/openai@latest";
import { DraftState, DraftPickState, playerSchema } from "../_shared/GraphState_types.ts"; 
import { getLeagueSettingsByLeagueId } from '../_shared/services/leagueManagementService.ts';
import { broadcastTeamUpdate } from "../_shared/realtimeService.ts";
import { getNextDraftPick, startPick, completePick , getAvailableDraftPool, getDraftRoster, doDRunDraft } from "../_shared/services/draftServices.ts";
import {  Tables } from '../_shared/supabase.ts'; // Import all necessary generated types


type LeagueSettings = Tables<{ schema: 'fantasy'; table: 'league_settings' }>;
// IMPORTANT: Get OpenAI API Key from Deno Environment Variable
const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');

if (!OPENAI_API_KEY) {
    console.error('[DraftGraph] OPENAI_API_KEY environment variable is not set!');
    // In a production scenario, you might want to throw an error
    // or ensure this setup is robust before function invocation.
}

const llm = new ChatOpenAI(
{
    openAIApiKey: OPENAI_API_KEY, // Pass the key from environment
    model: "gpt-4.1-mini",
    temperature: 0.0
});

const playerPicker = llm.withStructuredOutput(playerSchema);
function percentComplete(currentPick: number, totalPicks: number): number{
    const percent = ((currentPick / totalPicks) * 100) | 0;
    return percent; 
};

async function draftStrategistNode(state: typeof DraftPickState.State){
    console.log(`\n--- Draft Strategist Node (Round ${state.draft_round}, Pick ${state.draft_pick_number}) ---`);
    const currentTeamName = state.league_team_name;
    const teamDescription = state.team_description;
    const starting_position_requirements = state.starting_position_requirements || {};
    const totalPicks = state.total_picks;
  

    await  broadcastTeamUpdate("info", {
        message: ` ${state.league_team_name} thinking...... `
    });

    // Guard against empty draft pool
    if (state.draft_pool.length === 0) {
        await  broadcastTeamUpdate("info",{ type: "error", message: `Draft pool is empty. Cannot make pick for ${currentTeamName}.` });
        console.error(`[DraftStrategist] Draft pool is empty. Cannot make pick for ${currentTeamName}.`);
        throw new Error("Draft pool is empty."); // Propagate error to stop draft
    }

    const prompt = `Given our current team roster: ${JSON.stringify(state.team_roster)},
     and the available draft pool: ${JSON.stringify(state.draft_pool)}.
     What is the optimal draft strategy and who is the best available player to pick?
     IMPORTANT: Only select a player that is PRESENT in the provided draft_pool array.
     `; // Added explicit instruction for LLM

    // console.log(prompt );
    console.log(`You are a draft strategist for a fantasy football team named ${currentTeamName}. and your goals are ${teamDescription}. `);
    console.log(`Ensure you draft a player for each required starting position: ${JSON.stringify(starting_position_requirements)}.`);
    console.log(`You are in round ${state.draft_round} of ${state.total_draft_rounds}, pick ${state.draft_pick_number} of ${totalPicks}.`);


    let response;
    try {
        response = await playerPicker.invoke([
            { role: "system", content: `You are a draft strategist for a fantasy football team named ${currentTeamName}. and your goals are ${teamDescription}. ` },
            { role: "system", content: `There will be a total of ${state.total_draft_rounds} players on the roster. Ensure you draft a player for each required starting positions: ${JSON.stringify(starting_position_requirements)}. 'DEF' must be either 'DB', 'DL', or 'LB'. The 'FLEX' can be either 'RB', 'WR', 'TE'` },
            { role: "system", content: `You are in round ${state.draft_round} of ${state.total_draft_rounds}, pick ${state.draft_pick_number} of ${totalPicks}.` },
            { role: "user", content: prompt }
        ]);

        // Validate if the chosen player is actually in the draft pool
        const playerInPool = state.draft_pool.some(p => p.player_id === response.player_id);
        if (!playerInPool) {
            console.warn(`[DraftStrategist] LLM suggested player ${response.player_name} (ID: ${response.player_id}) not found in current draft pool. Retrying or selecting fallback.`);
            await  broadcastTeamUpdate("info",{ type: "info", message: `LLM suggested invalid player. Attempting re-pick or fallback.` });
            // You might implement retry logic, or pick a random player here
            // For now, let's just pick the first available player if LLM fails this check
            response = state.draft_pool[0];
            if (!response) {
                 throw new Error("Draft pool became empty during strategic pick validation.");
            }
        }

    } catch (llmError) {
        console.error(`[DraftStrategist] Error invoking LLM for ${currentTeamName}:`, llmError);
        await  broadcastTeamUpdate("info",{ type: "error", message: `Error from Draft Strategist LLM. Auto-picking player.` });
        // Fallback: If LLM fails, pick the first available player to continue the draft
        response = state.draft_pool[0];
        if (!response) {
            throw new Error("Draft pool is empty, and LLM failed to pick.");
        }
    }

    return {
        current_pick_player: response
    };
}

async function pickPlayer(state: typeof DraftPickState.State) {
    console.log(`\n--- Processing Pick for ${state.league_team_name} (Round ${state.draft_round}, Pick ${state.draft_pick_number}) ---`);
    const currentPickPlayer = state.current_pick_player;
    const currentPick = state.draft_pick_number;
    const total_picks = state.total_picks;
    const pComplete = percentComplete(currentPick,total_picks);
    if (!currentPickPlayer || !currentPickPlayer.player_id) {
        console.error(`[PickPlayer] No valid player found for pick. State: ${JSON.stringify(state)}`);
        await  broadcastTeamUpdate("info",{ type: "error", message: `No valid player to pick for ${state.league_team_name}. Stopping.` });
        throw new Error("No valid player to pick.");
    }

    console.log(`Picking player: ${currentPickPlayer.player_name} (${currentPickPlayer.position_type})`);

    const updatedRoster = [...state.team_roster, currentPickPlayer];
    const updatedDraftPool = state.draft_pool.filter(p => p.player_id !== currentPickPlayer.player_id);

    await  broadcastTeamUpdate("status", {
        type: 'status',
        progress: pComplete,
        message: `[${pComplete}%]  -- (Round ${state.draft_round}, Pick ${state.draft_pick_number}) -- ${state.league_team_name} has picked ${currentPickPlayer.player_name} (${currentPickPlayer.position_type}) `
    });
    await completePick(state.pick_id, currentPickPlayer.player_id);
    console.log(`[PickPlayer] Completed pick for ${state.pick_id}: ${currentPickPlayer.player_name} (ID: ${currentPickPlayer.player_id})`);
    console.log(`Player ${currentPickPlayer.player_name} picked successfully for ${state.league_team_name}.`);
    return { team_roster: updatedRoster, draft_pool: updatedDraftPool };
}



async function initializeDraft(state: typeof DraftPickState.State) {
    console.log(`Initializing draft... for league : ${state.league_id}`);
    const pick_id = state.pick_id; // Assuming this is the pick ID for the current draft
    await startPick(pick_id); // Reset any previous pick state
    return {};
}

function endPick(state: typeof DraftPickState.State) {
    const leagueId = state.league_id || 1; // Default to league ID 1 if not provided
    const season = state.current_season || 2024; // Default to current season if
    console.log(`Ending pick for league: ${leagueId}, pick ID: ${state.pick_id}`);
    // doDRunDraft(leagueId, season);
    return {};
}

function getRoundGraph() {
    const singleRoundGraph = new StateGraph(DraftPickState)
        .addNode("initialize_draft", initializeDraft)
        .addNode("draft_strategist", draftStrategistNode)
        .addNode("pick_player", pickPlayer)
        .addNode("end_pick", endPick)
        .addEdge(START, "initialize_draft")
        .addEdge("initialize_draft", "draft_strategist")
        .addEdge("draft_strategist", "pick_player")
        .addEdge("pick_player", "end_pick")
        .addEdge("end_pick", END);
    return singleRoundGraph.compile();
}


 /* Draft Sub-Graph
 * @param state The current state of the fantasy football application.
 * @returns The updated state after running the draft sub-graph.
 * This function simulates the draft process and updates the state accordingly.
 */
export async function runDraftSubGraph(state: typeof DraftState.State): Promise<any> {
    console.log("--> Calling the DRAFT GRAPH ...");
    
    const currentSeason = state.current_season || 2024; // Default to 2024 if not provided
    const leagueId = state.league_id || 1; // Default to league ID 1 if not provided
    const leagueSettings: LeagueSettings | null = await getLeagueSettingsByLeagueId(leagueId);
    const scoreMode = leagueSettings?.scoring_mode || "ESPN"; // Default to ESPN scoring mode if not provided
    console.log (`League settings for ID ${leagueId}:`, leagueSettings);
    const draftStatus = await getNextDraftPick(leagueId, currentSeason)
    console.log(`Next draft pick for league ${leagueId} in season ${currentSeason}:`, draftStatus);

    const playerPoolwScores = await getAvailableDraftPool(leagueId, 1, currentSeason, scoreMode);// default to week 1 for draft setup
    if (!playerPoolwScores.data || playerPoolwScores.data.length === 0) {
        console.error(`[DraftGraph] No players available in the draft pool for league ${leagueId} in season ${currentSeason}.`);
        throw new Error("Draft pool is empty.");
    }

    const teamRoster = await getDraftRoster(draftStatus?.pick_id || 0) || [];


// export const DraftPickState = Annotation.Root( {
// league_id: Annotation<number>, // Unique identifier for the league
//     pick_id: Annotation<number>, // Unique identifier for the draft pick
//     draft_round: Annotation<number>, // Current draft round
//     total_draft_rounds: Annotation<number>, // Total rounds in the draft
//     total_picks: Annotation<number>, // Total number of picks in the draft
//     draft_pick_number: Annotation<number>, // Current pick number in the draft
//     league_team_name: Annotation<string>, // Name of the team making the pick
//     team_description: Annotation<string>, // Description of the team making the pick
//     draft_pool: Annotation<Array<PlayerData>>, // All players available for draft
//     current_pick_player: Annotation<PlayerData>, // Player being picked in this round
//     starting_position_requirements: Annotation<Record<string, number>>, // Starting position requirements (e.g., QB: 1, WR: 2, RB: 2)
//     team_roster: Annotation<Array<PlayerData>>, // Players drafted by the user

// });
    const roundGraph = getRoundGraph();
    return roundGraph.invoke({
        league_id: leagueId,
        pick_id: draftStatus?.pick_id || 0, // Use the pick_id from the draft status
        draft_round: draftStatus?.round_number || 1, // Use the round_number from the draft status
        total_draft_rounds: leagueSettings?.total_roster_size || 10, // Use the total_rounds from the draft status
        total_picks: draftStatus?.total_picks || 1, // Use the total_picks from the draft status
        draft_pick_number: draftStatus?.pick_number || 1, // Use the pick_number from the draft status
        league_team_name: draftStatus?.team_name,
        team_description: draftStatus?.team_description || "No description provided",
        starting_position_requirements: leagueSettings?.starting_position_requirements || {},
        draft_pool: playerPoolwScores.data || [], // Use the data from the service call
        team_roster: teamRoster
    });


}