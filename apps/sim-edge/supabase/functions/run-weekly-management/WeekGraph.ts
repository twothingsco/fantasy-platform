// supabase/functions/_shared/WeekGraph.ts
import { StateGraph, START, END, Send } from "npm:@langchain/langgraph@latest"; 
import { ChatOpenAI } from "npm:@langchain/openai@latest";
import { FantasyFootballState, GameWeekState, lineupSchema } from "../_shared/GraphState_types.ts";
import { getTeamRosterScores } from "../_shared/services/scorringServices.ts"; // Path to services
import { getLeagueSettingsByLeagueId, getUserLeagueById } from '../_shared/services/leagueManagementService.ts';
import { getUserRoster, getOrCreateGameWeekTeamForUser, batchCreateGameWeekTeamPlayers } from '../_shared/services/rosterManagementService.ts'
import { PlayerData, Team } from '../_shared/services/types.ts'; // Path to types
import { broadcastTeamUpdate } from '../_shared/realtimeService.ts';

const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');

if (!OPENAI_API_KEY) {
    console.error('[WeekGraph] OPENAI_API_KEY environment variable is not set!');
}

const llm = new ChatOpenAI(
{
    openAIApiKey: OPENAI_API_KEY,
    model: "gpt-4.1-mini",
    temperature: 0.0
});

const playerPicker = llm.withStructuredOutput(lineupSchema);

// --- Individual Team Processing Nodes (remain mostly same) ---
async function PerformanceAnalystNode(state: typeof GameWeekState.State){
    const currentTeamName = state.league_team_name;
    const teamDescription = state.team_description;
    const starting_position_requirements = state.starting_position_requirements || {};
    const starting_lineup_size = state.starting_lineup_size || 7;
    console.log(`\n--- [WeekGraph:PerformanceAnalyst] Team ${currentTeamName} for Week ${state.current_week} ---`);

    if (!state.team_roster || state.team_roster.length === 0) {
        console.warn(`[WeekGraph:PerformanceAnalyst] Empty team roster for ${currentTeamName}.`);

        await broadcastTeamUpdate('info', { type: "info", message: `No roster for ${currentTeamName}. Skipping lineup analysis.` });
        return { lineup_submitted: [] };
    }
    console.log(`You must have exactly ${starting_lineup_size} players in the line up and must meet the ROSTER SLOT requirements: ${JSON.stringify(starting_position_requirements)}.  The 'FLEX' can only be one of the following positions: TE, WR, RB and must be included.`);

    const prompt = `Given our current team roster: ${JSON.stringify(state.team_roster)},
     and the performance of last week (if available): ${JSON.stringify(state.team_scores)}.
     It's week ${state.current_week}.
     What is the optimal starting lineup for this week? Your lineup must be composed ONLY of players from the provided current team roster.
     `;

    let response;
    try {
        response = await playerPicker.invoke([
            { role: "system", content: `You are a performance analyst for a fantasy football team named ${currentTeamName}. and your goals are ${teamDescription}. ` },
            { role: "system", content: `You must have exactly ${starting_lineup_size} players in the line up and must meet the ROSTER SLOT requirements: ${JSON.stringify(starting_position_requirements)}.  The 'FLEX' can only be one of the following positions: TE, WR, RB and must be included.` },
            { role: "user", content: prompt }
        ]);

        const rosterPlayerIds = new Set(state.team_roster.map(p => p.player_id));
        const validLineupPlayers = response.players.filter(p => rosterPlayerIds.has(p.player_id));

        if (validLineupPlayers.length !== response.players.length) {
            console.warn(`[WeekGraph:PerformanceAnalyst] LLM suggested players not in roster for ${currentTeamName}. Filtering invalid players.`);
            await broadcastTeamUpdate('info', { type: "info", message: `LLM suggested players not in roster. Adjusting lineup.` });
        }
        response.players = validLineupPlayers;

    } catch (llmError) {
        console.error(`[WeekGraph:PerformanceAnalyst] Error invoking LLM for ${currentTeamName}:`, llmError);
        await broadcastTeamUpdate('info', { type: "error", message: `Error from Performance Analyst LLM for ${currentTeamName}. Using current roster as lineup.` });
        response = { players: state.team_roster };
    }

    return {
        lineup_submitted: response.players || [],
    };
}


async function saveLineup(state: typeof GameWeekState.State) {
    const currentTeamName = state.league_team_name;
    console.log(`\n--- [WeekGraph:SaveLineup] Team ${currentTeamName} for Week ${state.current_week} ---`);
    const lineup_submitted = state.lineup_submitted;

    if (lineup_submitted.length === 0) {
        console.log(`[WeekGraph:SaveLineup] No lineup submitted for team ${currentTeamName} in week ${state.current_week}.`);
        await broadcastTeamUpdate('info', {
            type: "info",
            message: `(Week ${state.current_week}) -- No lineup submitted for ${currentTeamName}.`
        });
        return { team_roster: { [currentTeamName]: state.team_roster } }; // Return original roster if no lineup
    }

    // console.log(`[WeekGraph:SaveLineup] Week Lineup : ${JSON.stringify(lineup_submitted)}`);
    // Here, you would typically save the lineup to the database
    //userId: number,
    // leagueId: number,
    // gameWeekNumber: number,
    // seasonYear: number
    const leagueId = state.league_id;
    const currentWeek = state.current_week;
    const currentSeason = state.current_season;
    const league_team_id = state.league_team_id;
    console.log(`[WeekGraph:SaveLineup] league_team_id=${league_team_id}, leagueId=${leagueId}, currentWeek=${currentWeek}, currentSeason =${currentSeason} `)
    const gameWeekTeam = await getOrCreateGameWeekTeamForUser (league_team_id, leagueId, currentWeek, currentSeason);
    // console.log (`[WeekGraph:SaveLineup] gameWeekTeam = ${JSON.stringify(gameWeekTeam)}`)
    // game week team player
    //{ game_week_team_id: gameWeekTeamId, nfl_player_id: nflPlayerId, playing: playing, roster_slot: rosterSlot }
    //interface BatchGameWeekPlayerInsert {
    // nflPlayerId: number;
    // playing: boolean;
    // rosterSlot: string;

    const playersToInsert = lineup_submitted.map((player)=>{
        return {
            'nflPlayerId': player.player_id,
            'playing': true,
            'rosterSlot': player.roster_slot || 'FLEX' // Default to FLEX if not specified
        }
        
    });
    console.log(`[WeekGraph:SaveLineup] INSERT gameWeekTeamId ${gameWeekTeam.id} - playersToInsert ${JSON.stringify(playersToInsert)} `)
    await batchCreateGameWeekTeamPlayers ( gameWeekTeam.id, playersToInsert)
    await broadcastTeamUpdate('info', {
        type: "info",
        message: `-- (Week ${state.current_week}) -- ${state.league_team_name} has submitted lineup: ${lineup_submitted.map(p => p.player_name).join(", ")}`
    });

    return { team_roster: { [currentTeamName]: lineup_submitted } };
}

// Inner graph for a single team's weekly process
async function getSingleTeamWeekGraph() { // Renamed for clarity within this file
    const singleWeekGraph = new StateGraph(GameWeekState)
        .addNode("performance_analyst", PerformanceAnalystNode)
        .addNode("save_lineup", saveLineup)
        .addEdge(START, "performance_analyst")
        .addEdge("performance_analyst", "save_lineup")
        .addEdge("save_lineup", END);
    return singleWeekGraph.compile();
}
// helper function to build out the team_roster map
async function getTeamRoster( season: number, teams : Team[] ): Promise<Record<string, PlayerData[]>> {
    const team_roster = {};    
   // console.log("GetTeamRoster - teams ", teams)
    for (const currentTeam of teams)
    {   
        // console.log("CURRENT TEAM ", currentTeam);
        const teamName = currentTeam.team_name;
        const user_id = currentTeam.user_id;
       // console.log(`Tryig to get userRoster for ${user_id} - ${teamName}`)
        const curentTeamRoster = await getUserRoster(user_id, season)
        // console.log('GetTeamRoster currentTeamRoser = ',curentTeamRoster)
        const updateRoster = curentTeamRoster.map((userRoster)=>{
            
            const nflPlayer = userRoster.nfl_players;
           // console.log('nflPlayer - ', nflPlayer);
            return {
                player_id: nflPlayer.id,
                player_name: nflPlayer.name,
                nfl_team_name: nflPlayer.nfl_teams.name,
                position_type: nflPlayer.position_type
            }
        });
        //console.log('GetTeamRoster updateRoster = ',updateRoster)
        team_roster[teamName] = updateRoster;
   } 
   return team_roster;
}
// --- Overall Week Orchestration Nodes (extracted/adapted from GameCoordinator) ---

async function initializeWeek(state: typeof FantasyFootballState.State): Promise<Partial<typeof FantasyFootballState.State>> {
    console.log(`\n--- [WeekGraph:InitializeWeek] Initializing Week ${state.current_week} ---`);
   // Need to get the league_team and team_roster

    // 1. Get the league settings from the DB 
    // I might want to pass this setting object on the state
    const leagueId = state.league_id || 1; // Default to league ID
    const season = state.current_season;
    console.log (`1. Initial settings leagueId - ${leagueId} and the season = ${season}}`)

    const userLeague = await getUserLeagueById(leagueId);
    console.log (`2. userLeague - ${userLeague} and the season = ${season}}`)
    const leagueSettings = await getLeagueSettingsByLeagueId(leagueId);
    // console.log(` leagueSettings `, leagueSettings);
    const starting_position_requirements = leagueSettings?.starting_position_requirements || {};
    const starting_lineup_size = leagueSettings?.starting_lineup_size || 7;
    // console.log(` leagueSettings ${starting_lineup_size}  - ${leagueSettings.starting_lineup_size}`);
    // console.log (`3. Initial settings userLeague - ${JSON.stringify(userLeague)} and the leagueSettings = ${JSON.stringify(leagueSettings)}`)
    //2. get the league teams from the DB
    // console.log('userLeague ', userLeague)
    const teams: Team[] = userLeague.map((ul)=>{
        // console.log("UL ", ul);
        const team =  {
            user_id: ul.user_id,
            team_description: ul.users.team_description,
            team_name: ul.users.team_name
        }
        // console.log("MAPPED TEAM ", team);
        return team
    });
    // console.log("ALL OF THE TEAMS ", teams );
    const team_roster = await getTeamRoster(season,teams);
    //3. Set up the draft pool based on the league settings and teams
    const scoreMode = leagueSettings?.scoring_mode || "ESPN";
    
    // Fetch team scores from last week
    const scoreWeek = state.current_week > 1 ? state.current_week - 1 : 1; // Get scores for the previous week
    const team_scores = await getTeamScores(leagueId, scoreWeek, state.current_season, teams || []);
    if (Object.keys(team_scores).length === 0) {
        console.warn(`[WeekGraph:InitializeWeek] No previous team scores found for week ${scoreWeek}.`);
        await broadcastTeamUpdate('info', { type: "info", message: `No previous scores found for Week ${scoreWeek}.` });
    }
    console.log (`leage TEams ${JSON.stringify(teams)} and the team_roster = ${JSON.stringify(team_roster)}`)
    await broadcastTeamUpdate('status', {
        type: "status", // Use status for major step
        message: `Starting Weekly Management for Week ${state.current_week} for ${teams.length} teams.`,
        progress: 10
    });
    // Return the state with fetched scores
    return {
        starting_lineup_size: starting_lineup_size,
        league_teams: teams || [] ,
        team_roster: team_roster,
        starting_position_requirements: starting_position_requirements,
        team_scores: team_scores, // Store the aggregated scores for all teams
        //past_performance: playerPoolwScores.data, // Update if you refetch here
        // No other changes yet, next node will process teams
    };
}


async function processSingleTeamInWeek(state: typeof GameWeekState.State): Promise<Partial<typeof FantasyFootballState.State>> {
    
    console.log(`\n--- [WeekGraph:ProcessSingleTeam] Processing Team ${state.league_team_name} for Week ${state.current_week} ---`);
    const currentTeamName:string = state.league_team_name || "Unknown Team";

    const singleTeamWeekGraph = await getSingleTeamWeekGraph(); // Get the inner graph for a single team
    const weekResult = await singleTeamWeekGraph.invoke(state); // Invoke with the specific team's state

    // `weekResult` from `saveLineup` is `{ team_roster: { [teamName]: lineup } }`
    const updatedLineupForThisTeam = weekResult.team_roster[currentTeamName] || [];
    

    // LangGraph's merge strategy for Records will automatically merge these
    // This node's return value will update the overall `FantasyFootballState`'s `team_roster`
    return {
        team_roster: { [currentTeamName]: updatedLineupForThisTeam }
    };
}

async function endWeek(state: typeof FantasyFootballState.State): Promise<Partial<typeof FantasyFootballState.State>> {
    // console.log(`\n--- [WeekGraph:EndWeek] Ending Week ${state.current_week} ---`);
    await broadcastTeamUpdate('status', {type: "status", message: `Finished processing all teams for Week ${state.current_week}.`, progress: 80});

    // Optionally, if you want to explicitly broadcast the final state of team_rosters here
    // state.broadcastMessage({ type: "data", payload: state.team_roster });

    return {}; // No explicit state changes needed from this node, merging happens implicitly
}


// Function to fetch and aggregate team scores for each team roster 
async function getTeamScores(league_id: number, current_week: number, current_season: number, league_teams: Array<Record<string, any>>): Promise<Record<string, any>> {
    const teamScores = await getTeamRosterScores(current_week, current_season, league_id); // Assuming league ID is 1 for now
    const teamScoresData = teamScores.data || [];
    const teamNames = league_teams.map(team => team.team_name);

    const teamScoreData: Record<string, any> = {};
    // const fakeTeamNames = ["Team A", "Team B", "Team C", "Team D", "Team E"];
   // console.log(`Team Names: ${JSON.stringify(teamNames)}`);
   // console.log(`Team Scores Data: ${JSON.stringify(teamScoresData)}`);
    teamNames.forEach((name, index) => {
     //   console.log(`Processing team: ${name} at index ${index}`);
        // If the team name is not found in the scores, use a fake name for testing
        //Going to fake thhis for now 
        // const teamName = fakeTeamNames[index];
      //  console.log(`Using team name: ${name} for index ${index}`);
        teamScoreData[name] = teamScoresData.filter((score: IndividualPlayerFantasyScore) => score.user_fantasy_team_name === name).map((score: IndividualPlayerFantasyScore) => ({
            player_name: score.player_name,
            nfl_team_name: score.nfl_team_name,
            position_type: score.position_type,
            fantasy_score: score.fantasy_score
        }));
     //   console.log(`Scores for ${name}: ${JSON.stringify(teamScoreData[name])}`);
    });
    return teamScoreData;
}
// Conditional edge function to create parallel workers for each team
async function assignTeams(state: typeof FantasyFootballState.State) {
    await broadcastTeamUpdate('status', {type: "status", message: `Processing lineups for ${state.league_teams.length} teams.`, progress: 30});
    const leagueId = state.league_id || 1; // Default to league ID

    const nodesToRun = state.league_teams.map((currentTeam) => {
        
        //console.log(`[WeekGraph:AssignTeams] 1 Preparing state for Team ${currentTeam.team_name} for Week ${state.current_week}`);
        console.log('Starting lineup size:', state.starting_lineup_size);
        // Pass this specific team's roster and scores
        const league_team_id = currentTeam.user_id;
        const teamRosterForThisTeam = state.team_roster[currentTeam.team_name] || [];
        const teamScoresForThisTeam = {}; // state.team_scores[currentTeam.team_name] || [];
        //console.log ('`[WeekGraph:AssignTeams] 2 Preparing state currentTeam ');
        const gameWeekState: typeof GameWeekState.State = {
          league_id: leagueId,
          league_team_id: league_team_id,
          starting_lineup_size: state.starting_lineup_size,
          starting_position_requirements: state.starting_position_requirements,
          current_week: state.current_week,
          current_season: state.current_season,
          league_team_name: currentTeam.team_name,
          team_description: currentTeam.team_description || "No description",
          team_roster: teamRosterForThisTeam, // Pass this team's roster
          team_scores: teamScoresForThisTeam, // Pass this team's aggregated scores from `initializeWeek`
          lineup_submitted: [],
          waiver_moves: [],
          game_week_id: 0
        };
        //console.log ('`[WeekGraph:AssignTeams] 3  Preparing state currentTeam ');
        // Use Send to run 'process_single_team_in_week' node for each team in parallel
        return new Send("process_single_team_in_week", gameWeekState);
    });

    console.log(`[WeekGraph:AssignTeams] Nodes to run in parallel: ${nodesToRun.length}`);
    return nodesToRun;
}

async function finalizeWeekOutput(state: typeof FantasyFootballState.State): Promise<Partial<typeof FantasyFootballState.State>> {
    console.log(`\n--- [WeekGraph:FinalizeOutput] Finalizing weekly results for Week ${state.current_week} ---`);
    await broadcastTeamUpdate('status', {
        type: "status",
        message: 'Compiling Final Weekly Results',
        progress: 90
    });

    // You can choose what final 'data' to send. E.g., updated rosters or current week's scores.
    // For this example, let's assume the goal is to show the *updated lineups*.
    if (state.team_roster && Object.keys(state.team_roster).length > 0) {
        await  broadcastTeamUpdate("team_data",{type: "data", "team_roster" : state.team_roster});
    } else {
        console.warn("[WeekGraph:FinalizeOutput] No team rosters to broadcast in final data payload.");
        await broadcastTeamUpdate('info', { type: "info", message: "No final rosters to display." });
    }
    await broadcastTeamUpdate('status', {type: "status", message: `Weekly Management for Week ${state.current_week} complete!`, progress: 100});

    return {}; // No further state changes needed, just broadcast and end
}


// The main entry point for the weekly management graph
export async function getRunGameWeekGraph(state: typeof FantasyFootballState.State) {
    console.log("[WeekGraph] Building Run Game Week Graph workflow...");
    const loopGraphBuilder = new StateGraph(FantasyFootballState)
        .addNode("initialize_week", initializeWeek) // Fetches previous week's scores, sets up context
        .addNode("process_single_team_in_week", processSingleTeamInWeek) // This node runs in parallel for each team
        .addNode("end_parallel_processing", endWeek) // Merges results from parallel processing
        .addNode("finalize_week_output", finalizeWeekOutput) // Sends final data broadcast
        .addEdge(START, "initialize_week")
        .addConditionalEdges(
            "initialize_week",
            assignTeams, // Dynamically sends 'process_single_team_in_week' for each team
            ["process_single_team_in_week"] // This is the node that 'Send' will target for parallel execution
        )
        // All parallel `process_single_team_in_week` calls flow into `end_parallel_processing`
        .addEdge("process_single_team_in_week", "end_parallel_processing")
        .addEdge("end_parallel_processing", "finalize_week_output")
        .addEdge("finalize_week_output", END)
        .compile();
    return loopGraphBuilder.invoke(state);
}