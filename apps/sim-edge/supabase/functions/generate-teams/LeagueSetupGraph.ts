// supabase/functions/generate-teams/LeagueSetupGraph.ts
import { StateGraph } from "npm:@langchain/langgraph@latest";
import { z } from "npm:zod@latest";
import { createManualStructuredOutputChain } from "../_shared/llmService.ts";
// Import the definition object and the interface
import { FantasyFootballState } from "../_shared/GraphState_types.ts";
import { broadcastTeamUpdate } from "../_shared/realtimeService.ts";
import {setupNewLeagueWithTeams} from '../_shared/services/leagueManagementService.ts';
import {generateAndInsertLeagueSchedule} from '../_shared/services/generateSchedule.ts'
import { generateRandomLeagueName } from '../_shared/generateRandomWords.ts'; // Import the random league name generator

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

// // Initialize LLM outside of the node to avoid re-creation on every invocation
// const llm = new ChatOpenAI({
//     "model": "gpt-4o-mini",
//     "temperature": 0.0,
//     "apiKey": Deno.env.get('OPENAI_API_KEY')
// });
const teamSetup = createManualStructuredOutputChain(leagueSchema);


// Nodes
// Type `state` against the interface
async function teamNameNode(state: typeof FantasyFootballState.State) {
    const season = state.current_season;
    const teamCount = state.team_count;
    try {

        await broadcastTeamUpdate('status', {
            message: `Setting up teams for season ${season} with ${teamCount} teams.  Thinking....`,
            progress: 25
        });
        console.log(`Generating teams for season ${season} with ${teamCount} teams...`);
        const leagueName = state.league_name;

        const league_teams_data = await teamSetup.invoke([
            { role: "system", content: `You are the league commissioner for a new league called ${leagueName}.` },
            { role: "system", content: "Generate the teams in a fantasy football league. Provide creative names and brief descriptions." },
            { role: "user", content: `There are ${teamCount} teams in the league. Ensure each team has a unique name.` },
        ]);
        console.log("Generated Teams:", league_teams_data);
        for (const team of league_teams_data.teams) {
            await broadcastTeamUpdate('info', {
                message : `Generated Team ${team.name} with the goal of ${team.description} `
            });
            console.log(`Team Name: ${team.name}, Description: ${team.description}`);
        }

        await broadcastTeamUpdate('status', {
            message: 'Team generation completed.',
            progress: 50
        });
        return { league_teams: league_teams_data.teams };

    } catch (error) {
        console.error('Error generating teams:', error);
        await broadcastTeamUpdate('error', {
            message: 'Failed to generate teams.',
            error: error.message
        });
        return error
    }


}

async function createLeague(state: typeof FantasyFootballState.State) {
    try {
        
        console.log("Creating league structure...");
        const season = state.current_season;
        const leagueTeams = state.league_teams || [];
         const leagueName = state.league_name; // Use the league name from the state
         const mode_id = state.mode_id || 1; // Default to standard mode if not provided
        if (leagueTeams.length === 0) {
            console.warn("No teams provided to create league structure.");
            return {};
        }
        //Adding more messaging 
        await broadcastTeamUpdate('status', {
            message: `Saving League ${leagueName} to the DB ......`,
            progress: 75
        });

        const auth_user_id = state.auth_user_id;
        if (auth_user_id){
            console.log("Adding assigned auth Id ",auth_user_id );
            leagueTeams[0].auth_user_id = auth_user_id;
        }
        
        // Call the service to set up the league with the generated teams
       
        const newLeague = await setupNewLeagueWithTeams(leagueName, leagueTeams, season, {}, mode_id);
        // // generate the schedule.
        await generateAndInsertLeagueSchedule (newLeague.id);

        // Here you would typically create the league in your database
        // For now, we just log the teams
        console.log("League created with teams:", newLeague);
        await broadcastTeamUpdate('team_data',{"league" : newLeague});
        await broadcastTeamUpdate('status', {
            message: `League ${leagueName} created successfully.`,
            progress: 100
        });
    } catch (error) {
        console.error('Error creating league:', error);
        await broadcastTeamUpdate('error', {
            message: 'Failed to create league structure.',
            error: error.message
        });
    }
}



export async function generateLeagueTeams(season: number, teamCount: number, league_name?: string, auth_user_id?:string, mode_id?: number) {
    console.log(`Building League setup workflow for Fantasy Football...`);
    const leagueName = league_name || generateRandomLeagueName();
    //console.log("FantasyFootballState" , FantasyFootballState);
    // Pass the definition object to StateGraph
    const orchestratorWorker = new StateGraph(FantasyFootballState)
        .addNode("teamName", teamNameNode)
        .addNode("createLeague", createLeague)
        // Define the edges between nodes
        .addEdge("__start__", "teamName")
        .addEdge("teamName", "createLeague")
        .addEdge("createLeague", "__end__")
        .compile();

    console.log(`Invoking graph for Season: ${season}, Team Count: ${teamCount}`);
    return orchestratorWorker.invoke({
        league_name: leagueName, // Pass the league name to the state
        current_season: season,
        team_count: teamCount,
        auth_user_id: auth_user_id, // Name of the league
        mode_id: mode_id || 1 // Fantasy mode (1 = Standard, 2 = KOTH, etc.)
    } as typeof FantasyFootballState); // Cast initial state to the interface

    // console.log("League Setup Graph completed. Generated Teams:", finalState.league_teams);
    // return finalState.league_teams;
}