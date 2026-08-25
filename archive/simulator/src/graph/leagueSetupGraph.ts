import { StateGraph } from "@langchain/langgraph";
import { z } from "zod";
import { ChatOpenAI } from "@langchain/openai";
import {FantasyFootballState}   from "./GraphState_types";

// Schema for structured output to use in planning
const teamSchema = z.object({
  name: z.string().describe("Creative Name for your team."),
  description: z.string().describe(
    "Brief overview of your team's strategy and goals."
  ),
});

const leagueSchema = z.object({
  teams: z.array(teamSchema).describe("Teams in the league."),
});
// Nodes
async function teamName(state: typeof FantasyFootballState.State) {
  // Generate queries
  const season = state.current_season;
  const teamCount = state.team_count;
  const broadcastMessage = state.broadcastMessage;
  broadcastMessage({
    type: "info",
    message: `Setting up teams for season ${season} with ${teamCount} teams.`
  });
  const league_teams = await teamSetup.invoke([
    { role: "system", content: "Generate the teams in a fantasy football league." },
    { role: "user", content: `There are ${teamCount} teams in the league.` },
  ]);
  //const teamNames = league_teams.teams.map((team: any) => team.name);
  // loop through the teams and broadcast their names and descriptions
  league_teams.teams.forEach((team: any) => {
    broadcastMessage({
      type: "info",
      message: `Team Name: ${team.name}, Goals: ${team.description}`
    });
  });
  return { league_teams: league_teams.teams };
}

const llm = new ChatOpenAI(
    {
        "model": "gpt-4.1-mini",
        "temperature": 0.0
    });
// Augment the LLM with schema for structured output
const teamSetup = llm.withStructuredOutput(leagueSchema);

export async function getLeagueSetupGraph() {
    // Build workflow
    console.log("Building League setup workflow for Fantasy Football...");
    const orchestratorWorker = new StateGraph(FantasyFootballState)
        .addNode("teamName", teamName)
        .addEdge("__start__", "teamName")
        .addEdge("teamName", "__end__")
        .compile();
    //TODO: Add the league setup and teams to the DB 
    return orchestratorWorker;
}

export async function start(season: number, teamCount: number, broadcastMessage: any ) {

    // Build workflow
    console.log("Building orchestrator workflow for Fantasy Football League setup...");
    const orchestratorWorker = await getLeagueSetupGraph();

    // Invoke
    const state = await orchestratorWorker.invoke({
    broadcastMessage: broadcastMessage,
    current_season: season
    , team_count: teamCount});
    console.log(state.league_teams);
    return state.league_teams;
    
}