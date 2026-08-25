import { StateGraph, START, END } from "@langchain/langgraph";
import { ChatOpenAI } from "@langchain/openai";
import {DraftState, DraftPickState, playerSchema}   from "./GraphState_types";


const llm = new ChatOpenAI(
{
    "model": "gpt-4.1-mini",
    "temperature": 0.0
});

const playerPicker = llm.withStructuredOutput(playerSchema);
// /**
//  * LangGraph Node: Draft Strategist
//  * This node uses an LLM to determine the optimal draft strategy and suggests a player.
//  * @param state The current FantasyFootballState.
//  * @returns An updated state with a suggested pick, or a signal to wait.
//  */
async function draftStrategistNode(state: typeof DraftPickState.State){
    console.log(`\n--- Draft Strategist Node (Round ${state.draft_round}, Pick ${state.draft_pick_number}) ---`);
    const currentTeamName = state.league_team_name; 
    const teamDescription = state.team_description;
    const prompt = `Given our current team roster: ${JSON.stringify(state.team_roster)},
     and the available draft pool: ${JSON.stringify(state.draft_pool)}.
     It's round ${state.draft_round}, pick ${state.draft_pick_number}.
     What is the optimal draft strategy and who is the best available player to pick?`;
    const response = await playerPicker.invoke([
        { role: "system", content: `You are a draft strategist for a fantasy football team named ${currentTeamName}. and your goals are ${teamDescription}. ` },
        { role: "user", content: prompt }
    ]);
    return {
        current_pick_player: response
    };
}

async function pickPlayer(state: typeof DraftPickState.State) {
    console.log(`\n--- Processing Pick for ${state.league_team_name} (Round ${state.draft_round}, Pick ${state.draft_pick_number}) ---`);
    // Logic to process the pick
    const currentPickPlayer = state.current_pick_player;
    console.log(`Picking player: ${currentPickPlayer.player_name} (${currentPickPlayer.position_type})`);
    // Update team roster
    const updatedRoster = [...state.team_roster, currentPickPlayer];
    console.log(`Updated roster: ${JSON.stringify(updatedRoster)}`);
    // Update draft pool by removing the picked player
    const updatedDraftPool = state.draft_pool.filter(p => p.player_id !== currentPickPlayer.player_id);
    const broadcastMessage = state.broadcastMessage;
    broadcastMessage({
        type: "info",
        message: `--  (Round ${state.draft_round}, Pick ${state.draft_pick_number}) -- ${state.league_team_name} has picked ${currentPickPlayer.player_name} (${currentPickPlayer.position_type}) `
    });
    return { team_roster: updatedRoster, draft_pool: updatedDraftPool };
}

async function getRoundGraph (){
    const singleRoundGraph = new StateGraph(DraftPickState)
        .addNode("draft_strategist", draftStrategistNode)
        .addNode("pick_player", pickPlayer) 
        .addEdge(START, "draft_strategist")
        .addEdge("draft_strategist", "pick_player")
        .addEdge("pick_player", END);
    return singleRoundGraph.compile();
}



/**
 * Determines the current team index in a snake draft.
 *
 * @param numTeams The total number of teams participating in the draft.
 * @param currentRound The current draft round (1-indexed).
 * @param currentPickInRound The current pick number within the current round (1-indexed).
 * @returns The 0-indexed team index for the current pick.
 */
function getCurrentTeamIndex(numTeams: number, currentRound: number, currentPickInRound: number): number {
    let teamIndex: number;

    if (currentRound % 2 !== 0) {
        // Odd rounds (1, 3, 5, ...): Draft order is normal (Team 0, Team 1, ...)
        teamIndex = currentPickInRound - 1; // Adjust for 0-indexed array
    } else {
        // Even rounds (2, 4, 6, ...): Draft order is reversed (Team (numTeams-1), Team (numTeams-2), ...)
        teamIndex = numTeams - currentPickInRound; // This directly gives the 0-indexed reversed order
    }

    // Basic validation to ensure the index is within bounds (optional but good practice)
    if (teamIndex < 0 || teamIndex >= numTeams) {
        // This should ideally not happen if inputs are valid (e.g., currentPickInRound <= numTeams)
        console.warn(`Calculated team index out of bounds: ${teamIndex}. numTeams: ${numTeams}, currentRound: ${currentRound}, currentPickInRound: ${currentPickInRound}`);
        // You might throw an error here depending on your application's error handling strategy
        // throw new Error("Invalid draft position calculated.");
    }

    return teamIndex;
}

async function endRound(state: typeof DraftState.State) {
    console.log(`\n--- Ending Round ${state.draft_round} ---`);
    // Logic to end the current round
    // e.g., finalize picks, update team rosters, etc.
    //first lets figure out if we need to move to the next round or just the next team pick
    const currentDraftRound = state.draft_round;
    const currentDraftPickNumber = state.draft_pick_number;
    
    const numTeams = state.league_teams.length;
    if (currentDraftPickNumber < numTeams) {
        // If not all teams have picked, we just increment the pick number
        const nextTeamIndex = getCurrentTeamIndex(numTeams, currentDraftRound, currentDraftPickNumber + 1);
        // If not all teams have picked, just increment the pick number
        return {
            draft_round: currentDraftRound,
            draft_pick_number: currentDraftPickNumber + 1,
            current_team_index: nextTeamIndex, // New team index for the next pick
        };
    }
    // If all teams have picked, we move to the next round
    const nextRound = currentDraftRound + 1;
    return {
        draft_round: nextRound,
        draft_pick_number: 1, // Reset pick number for the new round
        current_team_index: getCurrentTeamIndex(numTeams, nextRound, 1)// Reset to the first team for the new round based on snake direction
    };
}

async function shouldContinueLoop(state: typeof DraftState.State) {
    console.log(`\n--- Checking if we should continue the draft loop (Round ${state.draft_round}, Pick ${state.draft_pick_number}) ---`);
    console.log(`\n--- Checking the final state of team rosters:  ${state.team_roster} ----`);
    
    // Check if the current team index is less than the total number of teams
    if (state.draft_round <= state.total_draft_rounds) {
        // Increment the current team index for the next pick
        return "continue";  
    }
    const broadcastMessage = state.broadcastMessage;
    broadcastMessage({
        type: "info",
        message: `Draft completed for all rounds. `
    });
    // If all rounds are complete, end the draft
    return "end";
}   


/**
 * Draft Coordinator Node
 * This node orchestrates the draft process, managing the draft rounds, picks, and team rosters.
 * It handles the logic for each draft round and ensures that teams can make their picks.
 */
async function processSinglePick(state: typeof DraftState.State) {
    console.log("Processing single pick...");
    // Logic to process a single pick for the current team
    const currentTeam = state.league_teams[state.current_team_index];
    const currentTeamName = currentTeam.name || `Team ${state.current_team_index + 1}`;
    const teamRoster = state.team_roster[currentTeamName] || [];
    console.log(`Current team making a pick: ${currentTeamName} (Round ${state.draft_round}, Pick ${state.draft_pick_number})`);
    console.log(`draft_pool size : ${state.draft_pool.length} `);
    // Get the current draft graph for this round
    const roundGraph = await getRoundGraph();
    // Invoke the round graph to process the pick
    const roundResult = await roundGraph.invoke({
        broadcastMessage: state.broadcastMessage,
        draft_round: state.draft_round,
        draft_pick_number: state.draft_pick_number,
        league_team_name: currentTeam.name,
        team_description: currentTeam.description || "No description provided",
        draft_pool: state.draft_pool,
        team_roster: teamRoster,
        current_pick_player: null // This will be set by the draft strategist node
    }); 

    const currentTeamRoster = roundResult.team_roster || [];
   // const currentTeamRosterList = state.team_roster[currentTeamName] || [];
    // currentTeamRosterList.push(...currentTeamRoster);
    const updatedRoster = {...state.team_roster};
    updatedRoster[currentTeamName] = currentTeamRoster;


    // console.log(`Round result: ${JSON.stringify(roundResult)}`);
    console.log(`Updated team roster for ${currentTeamName}: ${JSON.stringify(updatedRoster[currentTeamName])}`);
    console.log(`updated draft_pool size : ${roundResult.draft_pool.length} `);
    return {
        draft_pool: roundResult.draft_pool || state.draft_pool,
        team_roster: updatedRoster,
    }
    
}

async function initializeDraft(state: typeof DraftState.State) {
    console.log("Initializing draft...");
    // Initialize draft state, e.g., set draft round to 1, pick number to 1, etc.
    return {
        draft_round: 1,
        draft_pick_number: 1,
        league_teams: state.league_teams,
        current_team_index: 0, // Start with the first team
        total_draft_rounds: state.total_draft_rounds,
        draft_pool: state.draft_pool,
        team_roster: []
        };
}


export function getDraftGraph() {
    const loopGraphBuilder = new StateGraph(DraftState)
    .addNode("initialize_draft", initializeDraft)
    .addNode("process_single_pick", processSinglePick)
    .addNode("endRound", endRound)
    .addEdge(START, "initialize_draft")
    .addEdge("initialize_draft", "process_single_pick") // Start the first iteration
    .addEdge("process_single_pick", "endRound") // After processing a pick, end the round
    .addConditionalEdges(
      "endRound", // After processing an item...
      shouldContinueLoop,     // ...check if we should continue...
      {
        "continue": "process_single_pick", // ...if yes, loop back to process the next item
        "end": END,                      // ...if no, end the graph
      }
       // Loop back to process the next pick
    )
  return loopGraphBuilder.compile();
}