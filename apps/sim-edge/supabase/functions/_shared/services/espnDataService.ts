import { getNflPlayersFromPlayerList } from "./rosterManagementService.ts";
import { PlayerData, Team } from "./generateSchedule.ts";
import { RawSchedule, RawMatchup } from './generateSchedule.ts';

const positionMap: { [key: string]: string } = {
    "WR/TE": "FLEX",
    "RB/WR/TE": "FLEX",
    "D/ST": "DEF",
    "Bench":    "BEN",
    // Add more mappings here if needed, e.g., "K": "KICKER",
};



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
  injuryStatus: string,
  rosteredPosition?: string
};

export type League = {
  league_id?: number,
  league_name: string,
  teams: Team[]
}

export async function mapESPNPlayersToPlayerData(espnPlayers: ESPNPlayer[]): Promise<PlayerData[]> {
  const playerList: PlayerData[] = espnPlayers.map(player => {
    const rosteredPosition = player.rosteredPosition || 'BEN';
    const slot = positionMap[rosteredPosition] ?? rosteredPosition;
     return {
       nfl_id: player.id,
       player_name: player.fullName,
       player_first_name: player.firstName,
       player_last_name: player.lastName,
       position_type: player.defaultPosition,
       nfl_team_name: player.proTeamAbbreviation,
       roster_slot: slot
     };
  });
  
  // Get a list of all players from the DB based on the ESPN IDs.
  const nflPlayers: PlayerData[] = await getNflPlayersFromPlayerList(playerList, 'espn');
  return nflPlayers;
};

export async function getESPNLeague(seasonId: number, scoringPeriodId: number, espnClient:any): Promise<League> {
  if (!espnClient) {
    throw new Error('ESPN client is not initialized with authentication cookies.');
  }
  console.log(`Retrieving ESPN league info for season ${seasonId}, week ${scoringPeriodId}...`);
   const leagueInfo = await espnClient.getLeagueInfo({ seasonId });
   // console.log('ESPN League Info:', leagueInfo);
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

export async function getESPNSchedule( seasonId: number, scoringPeriodId: number, userTeams: any, leagueTeams: Team[], espnClient:any): Promise<RawSchedule> {
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
   console.log(`Fetching Schedule for season ${seasonId}, week ${scoringPeriodId}...`);
  //  console.log('Team ID to User ID Map:', teamIdToUserIdMap);
  //  console.log('Team Name to User ID Map:', teamNameToUserIdMap);
  try {
  
    // const league = await espnClient.getBoxscoreForWeek({ seasonId: seasonId, matchupPeriodId:scoringPeriodId, scoringPeriodId:scoringPeriodId });
    // //console.log('LINEUP SLOT  ', league[0]);

    // // Iterate through each matchup
    // const matchups:RawSchedule = [];
    // league.forEach(matchup => {
    //   //console.log(Object.keys(matchup));
    //   const teamA = teamIdToUserIdMap.get(matchup.homeTeamId);
    //   const teamB = teamIdToUserIdMap.get(matchup.awayTeamId);
    //   //console.log (`FOUND TEAM A ${teamA} VS TEAM B ${teamB}`)
    //   const match: RawMatchup = { teamA: teamA, teamB: teamB };
    //   //console.log(`\nMatchup: ${teamIdToUserIdMap.get(matchup.homeTeamId)} vs ${teamIdToUserIdMap.get(matchup.awayTeamId)}`);
    //   matchups.push({...match});


    // });
    const matchupsPromise = espnClient.getBoxscoreForWeek({
        seasonId: seasonId,
        matchupPeriodId: scoringPeriodId,
        scoringPeriodId: scoringPeriodId
    });

    // 2. Chain the processing logic using .then(). This method returns a *new*
    //    Promise that will resolve with the result of the synchronous processing.
    return matchupsPromise.then((league: any) => {
        
        // This block runs only *after* the leaguePromise resolves successfully.
        
        const matchups: RawSchedule = [];
        
        // Synchronous processing
        league.forEach(matchup => {
            const teamA = teamIdToUserIdMap.get(matchup.homeTeamId);
            const teamB = teamIdToUserIdMap.get(matchup.awayTeamId);
            const match: RawMatchup = { teamA: teamA, teamB: teamB };
            matchups.push({ ...match });
        });

        // 3. The return value here becomes the resolved value of the new Promise
        //    that was returned by the entire function.
        return matchups; 
    });

  } catch (error) {
    console.error('Failed to retrieve weekly lineups:', error);
    return [];
  }
}