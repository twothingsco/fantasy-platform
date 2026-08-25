import { StateGraph, START, END, Send } from "@langchain/langgraph";
import { ChatOpenAI } from "@langchain/openai";
import {FantasyFootballState, GameWeekState, lineupSchema}   from "./GraphState_types";


const llm = new ChatOpenAI(
{
    "model": "gpt-4.1-mini",
    "temperature": 0.0
});

const playerPicker = llm.withStructuredOutput(lineupSchema);


// /**
//  * LangGraph Node: Performance Analyst Node
//  * This node uses an LLM to determine the optimal draft strategy and suggests a player.
//  * @param state The current FantasyFootballState.
//  * @returns An updated state with a suggested pick, or a signal to wait.
//  */
async function PerformanceAnalystNode(state: typeof GameWeekState.State){
    
    const currentTeamName = state.league_team_name; 
    const teamDescription = state.team_description;
    console.log(`\n--- Performance Analyst Node (Team ${currentTeamName} for Week ${state.current_week}) ---`);
    const prompt = `Given our current team roster: ${JSON.stringify(state.team_roster)},
     and the performance of last week: ${JSON.stringify(state.team_scores)}.
     It's week ${state.current_week}.
     What is the optimal lineup for this week?`;
    const response = await playerPicker.invoke([
        { role: "system", content: `You are a performance analyst for a fantasy football team named ${currentTeamName}. and your goals are ${teamDescription}. ` },
        { role: "user", content: prompt }
    ]);
    return {
        lineup_submitted: response.players || [],
    };
}


async function saveLineup(state: typeof GameWeekState.State) {
    const currentTeamName = state.league_team_name; 
    const broadcastMessage = state.broadcastMessage;
    console.log(`\n--- SAVING Lineup (Team ${currentTeamName} for Week ${state.current_week}) ---`);
    // Logic to process the lineup
    const lineup_submitted = state.lineup_submitted;
    if (lineup_submitted.length === 0) {
        console.log(`No lineup submitted for team ${currentTeamName} in week ${state.current_week}.`);
        return { lineup_submitted: [] };
    }
    console.log(`Week Lineup : ${JSON.stringify(lineup_submitted)}`);
    // Here we want to save the lineup to the database or process it further
    // For now, we will just log it
    broadcastMessage({
        type: "info",
        message: `--  (Week  ${state.current_week}) -- ${state.league_team_name} has picked ${lineup_submitted.map(p => p.player_name).join(", ")}`
    });
    return { };
}

async function geCurrentWeekGraph (){
    const singleWeekGraph = new StateGraph(GameWeekState)
        .addNode("performance_analyst", PerformanceAnalystNode)
        .addNode("save_lineup", saveLineup) 
        .addEdge(START, "performance_analyst")
        .addEdge("performance_analyst", "save_lineup")
        .addEdge("save_lineup", END);
    return singleWeekGraph.compile();
}

async function initializeWeek(state: typeof FantasyFootballState.State) {
    console.log(`\n--- Initializing Week ${state.current_week} ---`);
    const broadcastMessage = state.broadcastMessage;
    broadcastMessage({
        type: "info",
        message: `Starting Week ${state.current_week} for the league ${state.league_teams.map(team => team.name).join(", ")}`
    });
    // Logic to initialize the week, such as resetting scores, preparing rosters, etc.
    // Reset the state for the new week
    return {}
}

async function processSingleTeam(state: typeof GameWeekState.State) {
    console.log(`\n--- (processSingleTeam)_ Processing Team for Week ${state.current_week} for ${state.league_team_name}  ---`);
    const currentTeamName:string = state.league_team_name || "Unknown Team";
    // Logic to process a single team for the current week
    // This could involve fetching scores, updating rosters, etc.
    const currentWeekGraph = await geCurrentWeekGraph();
    const weekResult = await currentWeekGraph.invoke(state);
    const currentTeamRoster = weekResult.lineup_submitted || [];
   // const currentTeamRosterList = state.team_roster[currentTeamName] || [];
    // currentTeamRosterList.push(...currentTeamRoster);
    const updatedRoster = {[currentTeamName] : currentTeamRoster} ;
    // updatedRoster[currentTeamName] = currentTeamRoster;
    // console.log(`\n--- (processSingleTeam)_ Updating lineup ${JSON.stringify(updatedRoster)} ---`);

    return {team_roster: updatedRoster};
}

async function endWeek(state: typeof FantasyFootballState.State) {
    console.log(`\n--- Ending Week ${state.current_week}  ---`);
    // Logic to finalize the week, such as updating scores, notifying teams, etc.
    return {};
}

// Conditional edge function to create llm_call workers that each team
async function assignTeams(state: typeof FantasyFootballState.State) {
  // Kick off section writing in parallel via Send() API
  //set up the GameWeekState for each team
  console.log(`\n---  (assignTeams)_ Assigning Teams for Week ${state.current_week} ---`);
  
  const nodesToRun =  state.league_teams.map((currentTeam) =>{
    console.log(`\n--- Assigning Team ${currentTeam.name} for Week ${state.current_week} ---`);
    const gameWeekState = {
        broadcastMessage: state.broadcastMessage,
        current_week: state.current_week,
        league_team_name: currentTeam.name,
        team_description: currentTeam.description,
        team_roster: state.team_roster[currentTeam.name] || [],
        team_scores: state.team_scores[currentTeam.name] || []
   
    };

    return new Send("process_single_team", gameWeekState);
    });

    console.log(`Nodes to run for Week ${state.current_week}: ${nodesToRun.length}`);
    return nodesToRun;
}


export function getRunGameWeekGraph() {
    const loopGraphBuilder = new StateGraph(FantasyFootballState)
    .addNode("initialize_week", initializeWeek)
    .addNode("process_single_team", processSingleTeam)
    .addNode("endWeek", endWeek)
    .addEdge(START, "initialize_week")
    .addConditionalEdges(
        "initialize_week",
        assignTeams,
        ["process_single_team"]
    )
    .addEdge("process_single_team", "endWeek")
    .addEdge("endWeek", END)
  return loopGraphBuilder.compile();
}
