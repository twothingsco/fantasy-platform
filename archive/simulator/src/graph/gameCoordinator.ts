import { Annotation, StateGraph, Send } from "@langchain/langgraph";
import { FantasyFootballState } from "./GraphState_types";
import { getDraftGraph } from "./draftGraph";
import { getLeagueSetupGraph } from "./leagueSetupGraph";
import { getRunGameWeekGraph } from "./weekGraph";
import { getALLNFLPlayerFantasyScores, getDetailedLeagueScores } from "../services/scorringServices";
import { IndividualPlayerFantasyScore } from "../services/types";

/*
* League Setup Sub-Graph
* This sub-graph is responsible for setting up the league, including teams, settings, and rules.
*/
async function runLeagueSetupSubGraph(state: typeof FantasyFootballState.State): Promise<any> {
    console.log("--> Calling the LEAGUE SETUP SUB-GRAPH...");
    const broudcastMessage = state.broadcastMessage;
    broudcastMessage({
        type: "status",
        message: 'Initiallizing League Setup',
        progress: 10
    });
    const leagueSetupGraph = await getLeagueSetupGraph();
    const leagueTeamsState = await leagueSetupGraph.invoke({
        ...state
    });

    console.log("<-- LEAGUE SETUP SUB-GRAPH completed.");
    return {
        ...state,
        league_teams: leagueTeamsState.league_teams || [],
    };
}
/**
 * Draft Sub-Graph
 * @param state The current state of the fantasy football application.
 * @returns The updated state after running the draft sub-graph.
 * This function simulates the draft process and updates the state accordingly.
 */
async function runDraftSubGraph(state: typeof FantasyFootballState.State): Promise<any> {
    console.log("--> Calling the DRAFT SUB-GRAPH (Stub version)...");
    const broadcastMessage = state.broadcastMessage;
    broadcastMessage({
        type: "info",
        message: 'Beginning Draft Process'
    });
    const draftRounds = 5; // Assuming a total of 5 rounds for the draft
    const numofTeams = state.league_teams?.length || 0;
    const totalDraftSize = draftRounds * numofTeams;
    const draftGraph = getDraftGraph();

    const draftState = await draftGraph.invoke({
        broadcastMessage: state.broadcastMessage,
        total_draft_rounds: draftRounds,
        league_teams: state.league_teams || [],
        draft_pool: state.past_performance, // This should be populated with available players
    }, {
        "recursionLimit": totalDraftSize * 4 // Adjust recursion limit based on total draft size
    });

    console.log("<-- DRAFT SUB-GRAPH completed.");
    broadcastMessage({
        type: "status",
        message: 'Draft Process Completed',
        progress: 40
    });
    console.log(`FINISH DRAFT  team_roster: ${JSON.stringify(draftState.team_roster)}`);
    return { team_roster: draftState.team_roster || ["teamA"] };

}

/**
 * Regular Season Sub-Graph
 * @param state The current state of the fantasy football application.
 * @returns The updated state after running the regular season sub-graph.
 * This function simulates the regular season process and updates the state accordingly.
 */
async function runWeeklyManagementSubGraph(state: typeof FantasyFootballState.State): Promise<any> {
    console.log(`--> Calling the WEEKLY MANAGEMENT SUB-GRAPH for Week ${state.current_week}...`);
    const broadcastMessage = state.broadcastMessage;

    /// mock up getting team scores from last week 
    let scoreWeek = state.current_week - 1;
    if (scoreWeek < 1) {
        scoreWeek = 1; // Ensure we don't go below week 1
    }
    const team_scores = await getTeamScores(1, scoreWeek, state.current_season, state.league_teams || []);

    // Setup the lineups for the week
    const currentWeekGraph = getRunGameWeekGraph();
    const weekResult = await currentWeekGraph.invoke({
        broadcastMessage: broadcastMessage,
        league_teams: state.league_teams || [],
        team_roster: state.team_roster || [],
        team_scores: team_scores || [],
        current_week: state.current_week
    });
    const team_roster = weekResult.team_roster || [];
    console.log(`WEEKLY MANAGEMENT SUB-GRAPH completed. Team Roster: ${JSON.stringify(team_roster)}`);
    broadcastMessage({
        type: "status",
        message: 'Complete Regular Season Process',
        progress: 60
    });
    return { team_roster: team_roster };
}
async function compileWeeklyResults(state: typeof FantasyFootballState.State): Promise<any> {
    console.log(`--> Compiling weekly results for Week ${state.current_week}...`);
    const broadcastMessage = state.broadcastMessage;
    broadcastMessage({
        type: "status",
        message: 'Compiling Weekly Results',
        progress: 80
    });

    const team_scores = await getTeamScores(1, state.current_week, state.current_season, state.league_teams || []);

    if (state.current_week == 0) {
        broadcastMessage({
            type: "data",
            payload: state.team_roster || [],
            progress: 80
        });
        return;
    }
    else if (team_scores && Object.keys(team_scores).length > 0) {
        console.log(`Team scores for Week ${state.current_week}: ${JSON.stringify(team_scores)}`);
        broadcastMessage({
            type: "data",
            payload: team_scores || [],
            progress: 80
        });
    } else {
        console.log(`No team scores available for Week ${state.current_week}.`);
    }
}

async function getTeamScores(league_id: number, current_week: number, current_season: number, league_teams: Array<Record<string, any>>): Promise<Record<string, any>> {
    const teamScores = await getDetailedLeagueScores(current_week, current_season, league_id); // Assuming league ID is 1 for now
    const teamScoresData = teamScores.data || [];
    const teamNames = league_teams.map(team => team.name);

    const teamScoreData: Record<string, any> = {};
    const fakeTeamNames = ["Team A", "Team B", "Team C", "Team D", "Team E"];
    console.log(`Team Names: ${JSON.stringify(teamNames)}`);
    console.log(`Team Scores Data: ${JSON.stringify(teamScoresData)}`);
    teamNames.forEach((name, index) => {
        console.log(`Processing team: ${name} at index ${index}`);
        // If the team name is not found in the scores, use a fake name for testing
        //Going to fake thhis for now 
        const teamName = fakeTeamNames[index];
        console.log(`Using team name: ${teamName} for index ${index}`);
        teamScoreData[name] = teamScoresData.filter((score: IndividualPlayerFantasyScore) => score.user_fantasy_team_name === teamName).map((score: IndividualPlayerFantasyScore) => ({
            player_name: score.player_name,
            nfl_team_name: score.nfl_team_name,
            position_type: score.position_type,
            fantasy_score: score.fantasy_score
        }));
        console.log(`Scores for ${name}: ${JSON.stringify(teamScoreData[name])}`);
    });
    return teamScoreData;
}

async function determineGamePhase(state: typeof FantasyFootballState.State): Promise<any> {
    console.log(`--> Determining game phase for Week ${state.current_week}...`);
    const broudcastMessage = state.broadcastMessage;
    const currentWeek: number = Number(state.current_week) || 0;
    broudcastMessage({
        type: "info",
        message: `--> Determining game phase for Week ${currentWeek}...`
    });
    const league_teams = state.league_teams || [];
    const team_roster = state.team_roster || [];
    const teamScores = state.team_scores || [];
    console.log(`League Teams: ${JSON.stringify(league_teams)}`);
    console.log(`Team Roster: ${JSON.stringify(team_roster)} length: ${team_roster.length} week ${currentWeek} currentWeek ==== 0 :${currentWeek === 0} typeof currentWeek: ${typeof currentWeek} `);
    let currentPhase: string;

    // Logic to determine the current game phase
    if (league_teams.length === 0) {
        currentPhase = 'pre_draft'; // If no teams, we are in pre-draft phase
    }
    else if (currentWeek === 0 && team_roster.length === 0) {
        currentPhase = 'draft';
    } else if (currentWeek > 0 && currentWeek <= 17 && team_roster.length === 0) {
        currentPhase = 'regular_season';
    } else if (currentWeek > 0 && currentWeek <= 20) {
        currentPhase = 'playoffs';
    } else {
        currentPhase = 'weekEnd';
    }
    console.log(`Current game phase determined: ${currentPhase}`);
    return ({
        gamePhase: currentPhase
    })
}

const getGamePhaseBranch = (state: typeof FantasyFootballState.State): string => {
    // This function reads the 'gamePhase' property from the state
    const phase = state.gamePhase;
    // You might want a default or error handling here if 'phase' could be undefined
    if (!phase) {
        console.error("Game phase not determined in state, defaulting to 'weekEnd'.");
        return 'weekEnd'; // Or throw an error, depending on desired behavior
    }
    return phase; // Returns the string that matches a key in your mapping
};

export async function start(season: number, teamCount: number, current_week: number, broadcastMessage: any) {
    // Build workflow
    // console.log("Building orchestrator workflow for Fantasy Football League setup...");
    const leagueSetupGraph = await getLeagueSetupGraph();

    console.log("START Building Game Coordinator workflow for Fantasy Football League setup...");

    const orchestratorWorker = new StateGraph(FantasyFootballState)
        .addNode("determineGamePhase", determineGamePhase)
        .addNode("LeagueSetupSubGraph", runLeagueSetupSubGraph)
        .addNode("DraftSubGraph", runDraftSubGraph)
        .addNode("WeeklyManagementSubGraph", runWeeklyManagementSubGraph)
        .addNode("compileWeeklyResults", compileWeeklyResults)
        .addEdge("__start__", "determineGamePhase")
        .addConditionalEdges(
            "determineGamePhase",
            getGamePhaseBranch,
            {
                'pre_draft': "LeagueSetupSubGraph",
                'draft': "DraftSubGraph",
                'regular_season': "WeeklyManagementSubGraph",
                'playoffs': "compileWeeklyResults",
                'weekEnd': "compileWeeklyResults"
            }
        )
        .addEdge("LeagueSetupSubGraph", "determineGamePhase")
        .addEdge("DraftSubGraph", "determineGamePhase")
        .addEdge("WeeklyManagementSubGraph", "determineGamePhase")
        .addEdge("compileWeeklyResults", "__end__")
        .compile();
    //TODO: ADD IN THE PLAYER TYPES WITH THE SCORES!!        
    const playerPoolwScores = await getALLNFLPlayerFantasyScores(current_week > 2 ? current_week - 1 : 1, season, "ESPN");
    if (!playerPoolwScores.data) {
        console.error("Error fetching player scores:", playerPoolwScores.error);
        throw new Error("Failed to fetch player scores");
    }
    console.log(`Player Pool with Scores length : ${playerPoolwScores.data.length}`);
    //const playerPool = await getAllPlayersforSeason(season);
    // Invoke
    const state = await orchestratorWorker.invoke({
        broadcastMessage: broadcastMessage,
        current_season: season,
        team_count: teamCount,
        current_week: current_week || 0,
        past_performance: playerPoolwScores.data
    });
    console.log(state.league_teams);
    return state.league_teams;
}