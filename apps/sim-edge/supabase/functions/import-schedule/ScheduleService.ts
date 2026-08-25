import pkg from 'npm:espn-fantasy-football-api/node.js';
import { broadcastTeamUpdate } from "../_shared/realtimeService.ts";
import { getOrCreateGameWeekTeamForUser, batchCreateGameWeekTeamPlayers } from '../_shared/services/rosterManagementService.ts'
import { getLeagueById , getUserLeagueById} from '../_shared/services/leagueManagementService.ts'
import { Team } from "../_shared/GraphState_types.ts";
import { getYahooLeague, mapYahooPlayersToPlayerData, getYahoochedule } from '../_shared/services/yahooDataService.ts'
import { mapESPNPlayersToPlayerData, getESPNLeague, getESPNSchedule } from '../_shared/services/espnDataService.ts'
import { getYahooFantasy } from '../_shared/yahooAuth.ts'
import { insertLeagueMatchupsFromSchedule, RawSchedule } from '../_shared/services/generateSchedule.ts';


/**
 * Executes an array of asynchronous tasks with a limited degree of concurrency.
 * @param {Array<function(): Promise<T>>} taskFactories - An array of functions that return a Promise (the tasks).
 * @param {number} limit - The maximum number of tasks to run concurrently.
 * @returns {Promise<Array<T>>} A promise that resolves with the results of all tasks.
 */
const runLimitedConcurrency = async (taskFactories, limit) => {
    // The results array to hold the output of each promise
    const results = [];
    // The currently running promises (limited to 'limit')
    const running = [];

    for (const factory of taskFactories) {
        // Create the task promise
        const task = factory();

        // Add the task promise to the 'running' array
        running.push(task);

        // Store the result when the task resolves, and remove it from 'running'
        const resultPromise = task.then((result) => {
            results.push(result);
            running.splice(running.indexOf(task), 1);
        });

        // Wait if we have hit the concurrency limit
        if (running.length >= limit) {
            // Wait for the oldest promise in the 'running' queue to complete
            // This 'await' blocks the loop from starting new tasks until a slot frees up
            await resultPromise;
        }
    }

    // Wait for all remaining running promises to complete
    await Promise.all(running);

    // Note: The order of results will be dependent on which promise resolves first,
    // not necessarily the order of the tasks. If order is critical, the implementation 
    // needs to track results by index. (See "Maintaining Order" below).
    return results;
};


async function doESPN(season: number, currentWeek: number, leagueId: number,userTeams:any, espnS2: string, SWID: string): Promise<RawSchedule> {
    if (!espnS2 || !SWID) {
            const errorMsg = `Missing ESPN authentication cookies (espnS2 or SWID) in league options.`;
            console.error(errorMsg);
            broadcastTeamUpdate('error', {
                message: errorMsg,
                progress: 100
            });
            throw new Error(errorMsg);
    }
    const { Client } = pkg;
    // Initialize ESPN client
    const espnClient = new Client({ leagueId });
    if (espnS2 && SWID) {
        espnClient.setCookies({ espnS2, SWID });
    }
    const espnLeague = await getESPNLeague(season, currentWeek, espnClient);
    if (!espnLeague) {
        const errorMsg = `ESPN League with ID ${leagueId} not found or inaccessible.`;
        console.error(errorMsg);
        broadcastTeamUpdate('error', {
            message: errorMsg,
            progress: 100
        });
        throw new Error(errorMsg);
    }
    console.log(`ESPN League found: ${espnLeague.league_name}`);
    const teams = espnLeague.teams;
    /// GENERATE SCHEDULE REFACTORED
    const numberOfGameWeeks = 18;
    const concurrencyLimit = 4;

    // 1. Create an array of 'task factories' (functions that return the CPU intensive Promise).
    // This prevents all 18 Promises from starting immediately.
    const taskFactories = Array.from({ length: numberOfGameWeeks }, (_, index) => {
        const week = index + 1;
        // Map each week to a function (factory) that, when called, returns the Promise
        // The task factory pattern is essential to prevent immediate execution.
        return () => getESPNSchedule(season, week, userTeams, teams, espnClient);
    });

// 2. Run the tasks with the concurrency limit.
const allMatchups = await runLimitedConcurrency(taskFactories, concurrencyLimit);

    /// GENERATE SCHEDULE
//     const numberOfGameWeeks =18;
    
//     // 1. Create an array of Promises for all the weeks.
//     const weekPromises = Array.from({ length: numberOfGameWeeks }, (_, index) => {
//         const week = index + 1;
//         // Map each week to a Promise returned by getESPNSchedule
//         return getESPNSchedule(season, week, userTeams, teams, espnClient);
//     });
  
//   // 2. Wait for all promises to resolve concurrently.
//   // The 'allMatchups' array will hold the result of each promise in order.
//   const allMatchups = await Promise.all(weekPromises);
  
  const rawSchedule: RawSchedule = [];

  
  // 3. Process the results.
  allMatchups.forEach((matchups, index) => {
    const week = index + 1;
    if (matchups && matchups.length > 0) {
      //console.log(`Inserting matchups for week ${week}...`);
      rawSchedule.push({ matchups });
    }
  });
        // const numberOfGameWeeks = 13;
        // const rawSchedule: RawSchedule = [];
        // for (let week = 1; week <= numberOfGameWeeks; week++) {
        //   const matchups = await getESPNSchedule( season, week, userTeams, teams, espnClient);
        //   if (matchups && matchups.length > 0) {
        //     console.log(`Inserting matchups for week ${week}...`);
        //     rawSchedule.push({ matchups });
        //   }
        // }
    return rawSchedule; 
}


async function doYahoo(season: number, currentWeek: number, leagueId: string, userTeams:any, refresh_token:string): Promise<RawSchedule> {
    const yf = await getYahooFantasy(refresh_token);
    const league = await getYahooLeague(leagueId, yf);
    if (!league) {
        const errorMsg = `Yahoo League with ID ${leagueId} not found or inaccessible.`;
        console.error(errorMsg);
        broadcastTeamUpdate('error', {
            message: errorMsg,
            progress: 100
        });
        throw new Error(errorMsg);
    }
    console.log(`Yahoo League found: ${league.league_name}`);
    const leagueTeams = league.teams;
    const rawSchedule: RawSchedule = await getYahoochedule(userTeams, leagueTeams, yf);
    return rawSchedule;
}

export async function getYahooWeeklyLineups(leagueId: string, week: number, yf:any): Promise<Team[]> {
    const league = await getYahooLeague(leagueId, yf);
    if (!league) {
        const errorMsg = `Yahoo League with ID ${leagueId} not found or inaccessible.`;
        console.error(errorMsg);
        broadcastTeamUpdate('error', {
            message: errorMsg,
            progress: 100
        });
        throw new Error(errorMsg);
    }
    console.log(`Yahoo League found: ${league.league_name}`);
    const teams = league.teams;
    console.log(`Processing ${teams.length} teams in Yahoo League ${league.league_name}`);
    console.log(`Fetching rosters for week ${week}...`);
    // const firstTeam = teams[0];
    // // console.log(`Full Team Roster : ${JSON.stringify(firstTeam.roster)}`)
    // const firstTeamRoster = await yf.roster.players(firstTeam.team_key, week.toString());
    // console.log(`Roster for Team ${firstTeam.name}:`,JSON.stringify(firstTeamRoster.roster));
    const mappedTeams: Team[] = await Promise.all(teams.map(async team => {
        console.log(`\nProcessing Team: ${team.name}`);
        const team_key = team.team_key;
        const roster = await yf.roster.players(team_key, week.toString());
        const mappedRoster = await mapYahooPlayersToPlayerData(roster.roster);

        // const mappedPlayerMap = new Map(
        //     mappedRoster.map(p => [p.nfl_id, p])
        // );
        // // console.log(`Roster for Team ${team.name}:`, roster);
        // const lineup = roster.roster.map(player => {
        //     const mappedPlayer = mappedPlayerMap.get(player.player_key);
        //     if (!mappedPlayer) {
        //         console.warn(`No matching player found in full roster for player key: ${player.player_key}`);
        //     }
        //     const slot = positionMap[player.selected_position] ?? player.selected_position;
        //     //console.log(`  -  ${mappedPlayer?.player_id} ${mappedPlayer?.player_name} ROSTER SLOT (${slot}) -`);
        //     return {
        //         ... mappedPlayer,
        //         roster_slot: slot
        //     };
        // });
        return {
                name: team.name,
                team_key: team.team_key,
                external_team_id: team.external_team_id,
                logo_url: team.logo_url,
                roster: mappedRoster
            } as Team;
    }));
    return mappedTeams;
}


async function getExternalLeagueInfo(leagueId: number): Promise<any | null> {
    const league = await getLeagueById(leagueId);
    if (!league) {
        const errorMsg = `League with ID ${leagueId} not found.`;
        console.error(errorMsg);
        broadcastTeamUpdate('error', {
            message: errorMsg,
            progress: 100
        });
        throw new Error(errorMsg);
    }
    console.log(`League found: ${league.name}`);
    
    const leagueOptions = league.league_options || {};
    const provider = leagueOptions.provider || 'unknown';
    // console.log(`League provider: ${provider}`);
    // broadcastTeamUpdate('status', {
    //     message: `League provider: ${provider}`,
    //     progress: 10
    // });
    if (provider !== 'espn' && provider !== 'yahoo') {
        const errorMsg = `Unsupported league provider: ${provider}. Only 'espn' and 'yahoo' are supported.`;
        console.error(errorMsg);
        broadcastTeamUpdate('error', {
            message: errorMsg,
            progress: 100
        });
        throw new Error(errorMsg);
    }
    const externamlLeagueId = leagueOptions.externalLeagueId;
    if (!externamlLeagueId) {
        const errorMsg = `External league ID not found in league options.`;
        console.error(errorMsg);
        broadcastTeamUpdate('error', {
            message: errorMsg,
            progress: 100
        });
        throw new Error(errorMsg);
    }
    return leagueOptions;
}

export async function importSchedule(leagueId: number, season: number, currentWeek: number): Promise<any> {
    // Simulate lineup import process with logs and delays
    console.log(`Starting Schedule import for League ID: ${leagueId}, Season: ${season}, Week: ${currentWeek}`);
    broadcastTeamUpdate('status', {
        message: `Starting Schedule import for League ID: ${leagueId}, Season: ${season}, Week: ${currentWeek}`,
        progress: 0
    });
    /// 1. Get the league options to determine espn or yahoo.
    const leagueInfo = await getExternalLeagueInfo(leagueId);
    if (!leagueInfo) {
        const errorMsg = `Failed to retrieve league information for League ID: ${leagueId}`;
        console.error(errorMsg);
        broadcastTeamUpdate('error', {
            message: errorMsg,
            progress: 100
        });
        throw new Error(errorMsg);
    }
    console.log(`League info retrieved: ${JSON.stringify(leagueInfo)}`);
    const { provider, externalLeagueId } = leagueInfo;  
    //2. get the userTeams. 
    const userTeams = await getUserLeagueById(leagueId);
    // 3. get the espn or yahoo raw schedules 
    console.log(`League provider: ${provider}, External League ID: ${externalLeagueId}`);
    let rawSchedule:RawSchedule = [];
    if (provider === 'espn'){
        // Do the espn lineup import
        const espnS2 = leagueInfo.espnS2;
        const SWID = leagueInfo.SWID;

        rawSchedule = await doESPN(season, currentWeek, externalLeagueId, userTeams, espnS2, SWID);
    } else if (provider === 'yahoo') {
        // Do the yahoo lineup import
       rawSchedule = await doYahoo(season, currentWeek, externalLeagueId, userTeams, leagueInfo.refresh_token);
    }
    
    console.log(`Schedule retrieved for ${userTeams.length} teams from ${provider.toUpperCase()} league.`);

    // For each team, call saveLineup(team, leagueId, currentWeek, season)
    // 3. Save the Schedule  to the database
    
    console.log(`Got the scheudle `, rawSchedule);

    if (rawSchedule.length > 0) {
        await insertLeagueMatchupsFromSchedule(leagueId, rawSchedule);
        console.log(`Schedule imported for ${rawSchedule.length} weeks.`);
        broadcastTeamUpdate('status', {
        message: `Schedule imported for ${rawSchedule.length} weeks.`,
        progress: 50
        });
    }

    // 4. Broadcast progress updates

    console.log(`Schedule import completed for League ID: ${leagueId}`);
    broadcastTeamUpdate('status', {
        message: `Schedule import completed for League ID: ${leagueId}`,
        progress: 100
    });

    return { success: true, leagueId, season, currentWeek };
}
