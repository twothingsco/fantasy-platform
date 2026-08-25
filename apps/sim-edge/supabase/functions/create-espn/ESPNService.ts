import pkg from 'npm:espn-fantasy-football-api/node.js';
import { getNflPlayersFromPlayerList, batchCreateRoster } from "../_shared/services/rosterManagementService.ts";
import { PlayerData, Team } from "../_shared/GraphState_types.ts";
import {  getUserLeagueById, setupNewLeagueWithTeams, updateLeageStatus } from '../_shared/services/leagueManagementService.ts';
import { insertLeagueMatchupsFromSchedule, RawSchedule } from '../_shared/services/generateSchedule.ts';
import { broadcastTeamUpdate } from "../_shared/realtimeService.ts";

const { Client } = pkg;

type ESPNTeam = {
  id: number,
  name: string,
  ownerName: string,
  logoURL: string,
  roster: ESPNPlayer[]
};
type ESPNPlayer = {
  seasonId: number,
  scoringPeriodId: number,
  id: number,
  firstName: string,
  fullName: string,
  lastName: string,
  proTeam: string,
  defaultPositionId: number,
  proTeamId: number,
  proTeamAbbreviation: string,
  defaultPosition: string,
  eligiblePositions: string[],
  averageDraftPosition: number,
  auctionValueAverage: number,
  percentChange: number,
  percentStarted: number,
  percentOwned: number,
  availabilityStatus: string,
  isDroppable: boolean,
  isInjured: boolean,
  injuryStatus: string
};

type League = {
  league_id?: number,
  league_name: string,
  teams: Team[]
}

async function mapESPNPlayersToPlayerData(espnPlayers: ESPNPlayer[]): Promise<PlayerData[]> {
  const playerList: PlayerData[] = espnPlayers.map(player => {
     return {
       nfl_id: player.id,
       player_name: player.fullName,
       player_first_name: player.firstName,
       player_last_name: player.lastName,
       position_type: player.defaultPosition,
       nfl_team_name: player.proTeamAbbreviation
     };
  });
  
  // Get a list of all players from the DB based on the ESPN IDs.
  const nflPlayers: PlayerData[] = await getNflPlayersFromPlayerList(playerList, 'espn');
  return nflPlayers;
};

async function getESPNLeague(seasonId: number, scoringPeriodId: number, espnClient): Promise<League> {
  if (!espnClient) {
    throw new Error('ESPN client is not initialized with authentication cookies.');
  }
  console.log(`Retrieving ESPN league info for season ${seasonId}, week ${scoringPeriodId}...`);
   const leagueInfo = await espnClient.getLeagueInfo({ seasonId });
    console.log('ESPN League Info:', leagueInfo);
    const leagueName = leagueInfo.name || '';
    console.log('ESPN League Name:', leagueName);
    const teams: ESPNTeam[] = await espnClient.getTeamsAtWeek({ seasonId, scoringPeriodId });

    const leagueTeams: Team[] = await Promise.all(teams.map(async (team: ESPNTeam) => {
      console.log(`Processing team: ${team.name} (ID: ${team.id}) with ${team.roster.length} players.`);
      const roster = await mapESPNPlayersToPlayerData(team.roster);
      
      return {
        external_team_id: team.id,
        name: team.name,
        description: `Managed by ${team.ownerName}`,
        logo_url: team.logoURL,
        owner: team.ownerName,
        roster: roster
      };
    }));
    return {
      league_name: leagueName,
      teams: leagueTeams
    };
  }

async function createRoster(seasonId: number, userTeams: any, leagueTeams: Team[]) {

  const teamToUserIdMap: Map<string, number> = userTeams.reduce((map, ut) => {
      const teamName = ut.users.team_name;
      const userId = ut.user_id;
      // Set the team_name as the key and user_id as the value
      map.set(teamName, userId);
      return map;
    }, new Map<string, number>());

  await Promise.all(leagueTeams.map(async (team) => {
    const userId = teamToUserIdMap.get(team.name);
    if (userId && team.roster) {
      const playerIds = team.roster.map(player => player.player_id);
      // console.log(`${seasonId} - Batch creating roster for team ${team.name} with user_id ${userId}, player IDs:`, playerIds);
      if (playerIds.length === 0) {
        console.warn(`No players found in roster for team ${team.name}. Skipping roster creation.`);
        return;
      }
      // Call the batchCreateRoster function to create the roster entries
      await batchCreateRoster(userId, seasonId, playerIds, team.name);
    }
  }));
}

async function importSchedule( seasonId: number, scoringPeriodId: number, userTeams: any, leagueTeams: Team[], espnClient) {
  if (!espnClient) {
    throw new Error('ESPN client is not initialized with authentication cookies.');
  }
  const teamNameToUserIdMap: Map<string, number> = userTeams.reduce((map, ut) => {
      const teamName = ut.users.team_name;
      const userId = ut.user_id;
      // Set the team_name as the key and user_id as the value
      map.set(teamName, userId);
      return map;
    }, new Map<string, number>());
  const teamIdToUserIdMap: Map<number, number> = leagueTeams.reduce((map, ut) => {
      const teamName = ut.name;
      const userId = teamNameToUserIdMap.get(teamName);
      const teamId = ut.external_team_id ? Number(ut.external_team_id) : null;
      if (!teamId || !userId) {
        console.warn(`Missing teamId or userId for team ${teamName}. Skipping mapping.`);
        return map;
      }
      // Set the team_id as the key and user_id as the value
      map.set(teamId, userId);
      return map;
  }, new Map<number, number>());
   console.log(`Fetching weekly lineups for season ${seasonId}, week ${scoringPeriodId}...`);
   console.log('Team ID to User ID Map:', teamIdToUserIdMap);
   console.log('Team Name to User ID Map:', teamNameToUserIdMap);
  try {
  
    const league = await espnClient.getBoxscoreForWeek({ seasonId: seasonId, matchupPeriodId:scoringPeriodId, scoringPeriodId:scoringPeriodId });
    //console.log('LINEUP SLOT  ', league[0]);

    // Iterate through each matchup
    const matchups: Array<{ teamA: number; teamB: number }> = [];
    league.forEach(matchup => {
      //console.log(Object.keys(matchup));
      
      //console.log(`\nMatchup: ${teamIdToUserIdMap.get(matchup.homeTeamId)} vs ${teamIdToUserIdMap.get(matchup.awayTeamId)}`);
      matchups.push({ teamA: teamIdToUserIdMap.get(matchup.homeTeamId), teamB: teamIdToUserIdMap.get(matchup.awayTeamId) });
      // Home Team Roster
    //   console.log(`Home Team Lineup (${matchup.homeScore} pts):`);
    //   matchup.homeRoster.forEach(player => {
    //     console.log(`  - ${player.fullName} ROSTER SLOT (${player.rosteredPosition}) - ${player.totalPoints} pts`);
    //   });

    //   // Away Team Roster
    //   console.log(`Away Team Lineup (${matchup.awayScore} pts):`);
    //   matchup.awayRoster.forEach(player => {
    //     console.log(`  -   ${player.fullName} ROSTER SLOT (${player.rosteredPosition}) - ${player.totalPoints} pts`);
    //   });

    });
    console.log(`Generated matchups for week ${scoringPeriodId}:`, matchups);
    return matchups;

  } catch (error) {
    console.error('Failed to retrieve weekly lineups:', error);
  }
}


export async function getLeagueTeams(leagueId: number, seasonId: number, scoringPeriodId: number, espnS2: string, SWID: string, mode_id: number): Promise<League> {
  const espnClient = new Client({ leagueId });
  if (espnS2 && SWID) {
    espnClient.setCookies({ espnS2, SWID });
  }

  try {
    console.log(`Fetching league data for league ID ${leagueId}, season ${seasonId}, week ${scoringPeriodId}...`);
    broadcastTeamUpdate('status', {
    message: `Fetching league data from ESPN ID: ${leagueId} for season ${seasonId}...`,
    progress: 10
  });
   const leagueData = await getESPNLeague(seasonId, scoringPeriodId, espnClient);
    const leagueTeams = leagueData.teams;
    const leagueOptions = { thirdParty: true, provider: 'espn', externalLeagueId: leagueId, espnS2: espnS2, SWID: SWID };
    const newLeague = await setupNewLeagueWithTeams(leagueData.league_name, leagueTeams, seasonId, leagueOptions, mode_id);
    const newLeagueId = newLeague.id;
    const leagueName = newLeague.league_name;
    broadcastTeamUpdate('status', {
      message: `Creating New league ${leagueName} ID: ${newLeagueId} for season ${seasonId}...`,
      progress: 20
    });
    const userTeams = await getUserLeagueById(newLeagueId);
    console.log(`New league created with ID ${newLeagueId}. Retrieved ${userTeams?userTeams.length:0} user teams.`);
    broadcastTeamUpdate('status', {
      message: `New league ${leagueName}.  ${userTeams ? userTeams.length : 0} Teams generated ...`,
      progress: 30
    });
   /// CREATES THE ROSTER FOR EACH TEAM
    await createRoster(seasonId, userTeams, leagueTeams);
    console.log(`Rosters created for league ID ${newLeagueId}.`);
    /// GENERATE SCHEDULE
    const numberOfGameWeeks = 16;
    const rawSchedule: RawSchedule = [];
    for (let week = 1; week <= numberOfGameWeeks; week++) {
      const matchups = await importSchedule(seasonId, week, userTeams, leagueTeams, espnClient);
      if (matchups && matchups.length > 0) {
        console.log(`Inserting matchups for week ${week}...`);
        rawSchedule.push({ matchups });
      }
    }
    await insertLeagueMatchupsFromSchedule(newLeagueId, rawSchedule);
    console.log(`Schedule imported for ${numberOfGameWeeks} weeks.`);
    broadcastTeamUpdate('status', {
        message: `Schedule imported for ${rawSchedule.length} weeks.`,
        progress: 50
      });
    /// generate the weekly lineup
     await updateLeageStatus(newLeagueId, 'Regular Season');
    broadcastTeamUpdate('status', {
      message: `New league ${leagueName} ID: ${newLeagueId} Complete.`,
      progress: 100
    });
    broadcastTeamUpdate('data', {
      message: `New league ${leagueName} ID: ${newLeagueId} Complete.`,
      data: {
        league_id: newLeagueId,
        league_name: leagueName,
        teams: leagueTeams
      },
      progress: 100
    });

    return {league_id: newLeagueId, league_name: leagueName, teams: leagueTeams};
    // return teams; // test ESPN teams return

  } catch (error) {
    console.error('Failed to retrieve league teams:', error);
    throw error;
  }
}


