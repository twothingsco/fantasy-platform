import pkg from 'npm:espn-fantasy-football-api/node.js';
import { broadcastTeamUpdate } from "../_shared/realtimeService.ts";
import { getOrCreateGameWeekTeamForUser, batchCreateGameWeekTeamPlayers } from '../_shared/services/rosterManagementService.ts'
import { getLeagueById , getUserLeagueById} from '../_shared/services/leagueManagementService.ts'
import { Team } from "../_shared/GraphState_types.ts";
import { getYahooLeague, mapYahooPlayersToPlayerData } from '../_shared/services/yahooDataService.ts'
import { mapESPNPlayersToPlayerData, getESPNLeague } from '../_shared/services/espnDataService.ts'
import { getYahooFantasy } from '../_shared/yahooAuth.ts'


async function doESPN(season: number, currentWeek: number, leagueId: number, espnS2: string, SWID: string): Promise<Team[]> {
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
    return await ESPNGetWeeklyLineups(teams,season, currentWeek, espnClient);
}

async function ESPNGetWeeklyLineups(teams: Team[], seasonId: number, scoringPeriodId: number, espnClient: any): Promise<Team[]> {
  try {
    
    const league = await espnClient.getBoxscoreForWeek({ seasonId: seasonId, matchupPeriodId:scoringPeriodId, scoringPeriodId:scoringPeriodId });
    //console.log('LINEUP SLOT  ', league[0]);

    // Iterate through each matchup
    const uniqueTeamsMap = new Map<string | number, Team>();
    await Promise.all(league.map(async matchup =>   {
        //   console.log(Object.keys(matchup));
        const homeTeamId = matchup.homeTeamId;
        const awayTeamId = matchup.awayTeamId;
        if (!uniqueTeamsMap.has(homeTeamId)) {
            const mappedHomeRoster = await mapESPNPlayersToPlayerData(matchup.homeRoster);
            uniqueTeamsMap.set(homeTeamId, {
              external_team_id: homeTeamId,
              name: '',
              description: '',
              roster: mappedHomeRoster
            } as unknown as Team);
            // console.log(`Added lineup for home team ID: ${homeTeamId}`, mappedHomeRoster);
        }
        if (!uniqueTeamsMap.has(awayTeamId)) {
            const mappedAwayRoster = await mapESPNPlayersToPlayerData(matchup.awayRoster);
            uniqueTeamsMap.set(awayTeamId, {
              external_team_id: awayTeamId,
              name: '',
              description: '',
              roster: mappedAwayRoster
            } as unknown as Team);
            // console.log(`Added lineup for away team ID: ${awayTeamId}`, mappedAwayRoster);
        }
    }));
    //update teams with the new roster 
    const updatedTeams: Team[] = teams.map(team => {
        const updatedTeam = uniqueTeamsMap.get(team.external_team_id);
        if (updatedTeam) {
            return { ...team, roster: updatedTeam.roster };
        }
        return team;
    });
    console.log(`Processed ${updatedTeams.length} teams with weekly lineups.`);
    return updatedTeams;

  } catch (error) {
    console.error('Failed to retrieve weekly lineups:', error);
  }
  return [];
}

async function doYahoo(season: number, currentWeek: number, leagueId: string, refresh_token:string): Promise<Team []> {
    const yf = await getYahooFantasy(refresh_token);
    return await getYahooWeeklyLineups(leagueId, currentWeek, yf);
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
                owner: team.owner,
                roster: mappedRoster
            } as Team;
    }));
    return mappedTeams;
}

async function saveLineup(team: Team, leagueId: number, currentWeek: number, currentSeason: number): Promise<void> {
    

    const league_team_id = team.user_id? team.user_id : 0;
    const lineup_submitted = team.roster? team.roster : [];
    const teamName = team.name;

    if (lineup_submitted && lineup_submitted.length === 0) {
        console.log(`[WeekGraph:SaveLineup] No lineup submitted for team ${teamName} in week ${currentWeek}.`);
        await broadcastTeamUpdate('info', {
            type: "info",
            message: `(Week ${currentWeek}) -- No lineup submitted for ${teamName}.`
        });
        return; // Return original roster if no lineup
    }
    // console.log(`[WeekGraph:SaveLineup] league_team_id=${league_team_id}, leagueId=${leagueId}, currentWeek=${currentWeek}, currentSeason =${currentSeason} `)
    const gameWeekTeam = await getOrCreateGameWeekTeamForUser (league_team_id, leagueId, currentWeek, currentSeason);

    const playersToInsert = lineup_submitted.map((player)=>{
        return {
            'nflPlayerId': player.player_id,
            'playing': true,
            'rosterSlot': player.roster_slot || 'FLEX' // Default to FLEX if not specified
        }
        
    });
    // console.log(`[LineupService:SaveLineup] INSERT gameWeekTeamId ${gameWeekTeam.id} - playersToInsert ${JSON.stringify(playersToInsert)} `)
    await batchCreateGameWeekTeamPlayers ( gameWeekTeam.id, playersToInsert)
    await broadcastTeamUpdate('info', {
        type: "info",
        message: `-- (Week ${currentWeek}) -- ${teamName} has submitted lineup: ${lineup_submitted.map(p => p.player_name).join(", ")}`
    });
    console.log(`[LineupService:SaveLineup] Completed INSERT gameWeekTeamId ${gameWeekTeam.id} for team ${teamName} `)
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

export async function importLineup(leagueId: number, season: number, currentWeek: number): Promise<any> {
    // Simulate lineup import process with logs and delays
    console.log(`Starting lineup import for League ID: ${leagueId}, Season: ${season}, Week: ${currentWeek}`);
    broadcastTeamUpdate('status', {
        message: `Starting lineup import for League ID: ${leagueId}, Season: ${season}, Week: ${currentWeek}`,
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
    // 2. get the espn or yahoo weekly lineups
    console.log(`League provider: ${provider}, External League ID: ${externalLeagueId}`);
    let teams: Team[] = [];
    if (provider === 'espn'){
        // Do the espn lineup import
        const espnS2 = leagueInfo.espnS2;
        const SWID = leagueInfo.SWID;

        teams = await doESPN(season, currentWeek, externalLeagueId, espnS2, SWID);
    } else if (provider === 'yahoo') {
        // Do the yahoo lineup import
       teams = await doYahoo(season, currentWeek, externalLeagueId, leagueInfo.refresh_token);
    }
    
    console.log(`Lineups retrieved for ${teams.length} teams from ${provider.toUpperCase()} league.`);

    // For each team, call saveLineup(team, leagueId, currentWeek, season)
    // 3. Save the lineups to the database
    const userTeams = await getUserLeagueById(leagueId);
    const teamToUserIdMap: Map<string, number> = userTeams.reduce<Map<string, number>>((map, ut) => {
    //   console.log(`Mapping team name ${ut.users.name} to user ID ${ut.user_id}`, ut.users); 
      const teamName = ut.users.name;
      const userId = ut.user_id;
      // Set the team_name as the key and user_id as the value
      map.set(teamName, userId);
      return map;
    }, new Map<string, number>());
    const lineupPromises: Promise<any>[] = [];
    for (const team of teams) {
        const userId = teamToUserIdMap.get(team.owner);
        if (!userId) {
            console.warn(`No user found for team name: ${team.owner}. Skipping lineup save.`);
            continue;
        }
        const promise = saveLineup({...team, user_id: userId}, leagueId, currentWeek, season);
        lineupPromises.push(promise);
        //console.log(`Importing lineup for team: ${team.name} (User ID: ${userId}) logo_url : ${team.logo_url}`);
    }
    try {
        const results = await Promise.all(lineupPromises);
        console.log(`Successfully saved lineups for ${results.length} teams.`);
    } catch (error) {
        // This catch block handles the error if ANY of the individual saveLineup calls fails.
        console.error("One or more lineup saves failed:", error);
    }
    // 4. Broadcast progress updates

    console.log(`Lineup import completed for League ID: ${leagueId}`);
    broadcastTeamUpdate('status', {
        message: `Lineup import completed for League ID: ${leagueId}`,
        progress: 100
    });

    return { success: true, leagueId, season, currentWeek };
}