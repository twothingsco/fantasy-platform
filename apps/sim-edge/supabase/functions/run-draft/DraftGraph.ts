// supabase/functions/_shared/DraftGraph.ts
import { StateGraph, START, END } from "npm:@langchain/langgraph@latest"; 
import { DraftState } from "../_shared/GraphState_types.ts"; 
import { getLeagueSettingsByLeagueId, updateLeageStatus } from '../_shared/services/leagueManagementService.ts';
import { broadcastTeamUpdate } from "../_shared/realtimeService.ts";
import {createRosterFromDraft } from "../_shared/services/rosterManagementService.ts";
import { populateDraftPicks, getNextDraftPick, doDraftPick } from "../_shared/services/draftServices.ts";



async function processSinglePick(state: typeof DraftState.State) {
    console.log("Processing single pick...");
    const leagueId = state.league_id || 1; // Default to league ID 1 if not provided
    const season = state.current_season || 2024; // Default to current season if not provided
    // Call draft-pick edge function to process the next pick
    doDraftPick(leagueId, season);
    return {};
}

async function initializeDraft(state: typeof DraftState.State) {
    console.log(`Initializing draft... for league : ${state.league_id}`);
    const season = state.current_season || 2024;
    const leagueId = state.league_id || 1; // Default to league ID
    const leagueSettings = await getLeagueSettingsByLeagueId(leagueId);
    //Log the begining of the draft.
    await broadcastTeamUpdate('status', {
            message: `Starting Fantasy Football Draft for Season ${season}.`,
            progress: 0,
        });
    await updateLeageStatus(leagueId, 'Drafting');
    console.log('[INITIALIZE DRAFT] leagueSettings', leagueSettings);
    await populateDraftPicks(leagueId, season);
    return {
    };
}
async function endDraft(state: typeof DraftState.State) {
    const season = state.current_season;
    const leagueId = state.league_id || 1; // Default to league ID
    console.log(`### END DRAFT ### ` );
    const results = await createRosterFromDraft(leagueId, season);
    console.log(`Draft completed for league ${leagueId} in season ${season}.`, results);
    await updateLeageStatus(leagueId, 'Regular Season');
    await broadcastTeamUpdate('status', {
        message: `Draft Complete for League ${leagueId} - Season ${season}.`,
        progress: 100,
    });
  
    return {};
}

function processDraft(state:typeof DraftState.State) {
    console.log("Processing draft...");
    return {};
}
/** 
 * Checks the draft state and returns the next action based on the current status.
 * @param state The current state of the draft.
 * @returns The next action to take in the draft process.
 */
async function getNextDraftAction(state: typeof DraftState.State): string {
    const league_id = state.league_id || 1; // Default to league ID 1 if not provided
    const season = state.current_season || 2024; // Default to current season if not provided
    const draftPick = await getNextDraftPick(league_id, season)
    const draftStatus = draftPick?.status || 'initialize';
    console.log(`[getNextDraftAction] Current draft status: ${draftStatus}`, draftPick);
    switch (draftStatus) {
        case 'drafting':
            return 'process_next_pick';
        case 'complete':
            return 'end_draft';
        default:
            return 'draft_error';
    }
}

/**
 * Checks the current status of the draft based on league settings.
 * @param state 
 * @returns 
 */
async function getDraftStatus (state: typeof DraftState.State):string {
    const leagueId = state.league_id || 1; // Default to league ID
    const leagueSettings = await getLeagueSettingsByLeagueId(leagueId);
    console.log(`[getDraftStatus] League settings for ID ${leagueId}:`, leagueSettings);
    if (!leagueSettings) {
        console.error(`[getDraftStatus] No league settings found for ID ${leagueId}.`);
        return 'Regular_Season'
    }
    const status = leagueSettings.league_status || 'Pre-Draft';
    console.log(`[getDraftStatus] Current draft status: ${status}`);
    if (status === 'Pre-Draft') {
        return 'Pre-Draft';
    } else if (status === 'Drafting') {
        return 'Drafting';
    } else {
        return 'Regular_Season';
    }
}

async function regularSeason(state: typeof DraftState.State) {
    console.log("Regular season already started, no draft actions needed.");
    await broadcastTeamUpdate('status', {
        message: `Draft Complete in Regular Season.`,
        progress: 100,
    });
    return {};
}

async function startDraft(state: typeof DraftState.State) {
    console.log("Starting draft process...");
    const leagueId = state.league_id || 1; // Default to league ID 1 if not provided
    const season = state.current_season || 2024; // Default to current season if not provided
    return {
        league_id: leagueId,
        season_year: season,
    };
}

function getDraftGraph() {
    const loopGraphBuilder = new StateGraph(DraftState)
    .addNode("startDraft", startDraft)
    .addNode("initialize_draft", initializeDraft)
    .addNode("processDraft", processDraft)
    .addNode("process_single_pick", processSinglePick)
    .addNode("endDraft", endDraft)
    .addNode("regularSeason", regularSeason)
    .addEdge(START, "startDraft")
    .addConditionalEdges(
      "startDraft", 
      getDraftStatus,// After processing an item...
      {
        "Pre-Draft": "initialize_draft", // ...if yes, loop back to process the next item
        "Drafting": "processDraft", 
        "Regular_Season": "regularSeason"                    // ...if no, end the graph
      }
       // Loop back to process the next pick
    )
    .addEdge("initialize_draft", "processDraft") // Start the first iteration
    .addConditionalEdges(
      "processDraft",
        getNextDraftAction,
      {
        "process_next_pick": "process_single_pick", // If there are more picks to process
        "end_draft": "endDraft", // If the draft is complete
        "draft_error": "regularSeason" // If there's an error, end the graph
      }
    )
    .addEdge("regularSeason", END) // If in regular season, end the graph
    .addEdge("process_single_pick", END) // After processing a pick, end the round
    .addEdge("endDraft", END)
  return loopGraphBuilder.compile();
}

 /* Draft Sub-Graph
 * @param state The current state of the fantasy football application.
 * @returns The updated state after running the draft sub-graph.
 * This function simulates the draft process and updates the state accordingly.
 */
export async function runDraftSubGraph(state: typeof DraftState.State): Promise<any> {
    console.log(`--> Calling the DRAFT GRAPH ... for season ${state.current_season}, league ${state.league_id}`);
    // await  broadcastTeamUpdate("info",{
    //     type: "info",
    //     message: 'Beginning Draft Process'
    // });

    const leagueId = state.league_id || 1; // Default to league ID 1 if not provided
    // const leagueSettings = await getLeagueSettingsByLeagueId(leagueId);
    // console.log (`League settings for ID ${leagueId}:`, leagueSettings);
    // const userLeague = await getUserLeagueById(leagueId);
    // console.log(`User league for ID ${leagueId}:`, userLeague);
    // const draftRounds = leagueSettings?.total_roster_size || 5; // Use league settings or default to 5
    // const numofTeams = userLeague?.length || 0;
    // const totalDraftSize = draftRounds * numofTeams;
    const draftGraph = getDraftGraph();

    //console.log(`Draft Graph initialized with ${numofTeams} teams and ${draftRounds} rounds.`);

   return draftGraph.invoke({
        current_season: state.current_season || 2024,
        league_id: leagueId,
        //  should be populated with available players
    });
}


/**
 * This endpoint shoould be called to run the draft process.
 * It should check the league settings and initialize the draft state.
 *  The basic flow is: 
 *  0. Find the current status of the draft.... 
 *  1. INITIALIZE -  populate the draft_picks with populate_snake_draft() function.
 *  2. CURRENT - If there is an active draft it calls the draft-pick endpoint to run a single pick.
 *  3. FINIALIZE - If all of the picks are made it will finalize the draft and create the final rosters with create_user_roster_from_draft()
 * 
 *  NEW GRAPH 
 *   checkDraft Status from the league Settings
 * Conditional edge node based on status
 *    Pre-Draft - Run INITIALIZE -> SetDraftState
 *    Drafting - SetDraftState -> conditional shouldContinueLoop
 *        if still in progress - Run CURRENT -> END 
 *       if completed - Run FINALIZE -> END
 *    Regular Season or any other status - return an error Draft already completed. ->END 
*/