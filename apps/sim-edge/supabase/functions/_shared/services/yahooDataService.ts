import { getNflPlayersFromPlayerList,  } from "./rosterManagementService.ts";
import { PlayerData, Team } from "../GraphState_types.ts";
import { RawSchedule, RawMatchup } from './generateSchedule.ts';


const positionMap: { [key: string]: string } = {
    "W/R/T": "FLEX",
    "BN":    "BEN",
    // Add more mappings here if needed, e.g., "K": "KICKER",
};

type YahooTeam = {
  team_key: string,
  team_id: number,
  name: string,
  managers: {nickname: string}[],
  team_logos : any[],
  roster: YahooPlayer[]
};
type YahooPlayer = {
  player_key: number,
  name: { full:string , first: string, last: string },
  editorial_team_full_name: string,
  editorial_team_abbr: string,
  position_type: string,
  selected_position: string
};

type League = {
  league_id?: number,
  league_name: string,
  teams: Team[]
}

export async function mapYahooPlayersToPlayerData(yahooPlayers: YahooPlayer[]): Promise<PlayerData[]> {

const playerList: PlayerData[] = yahooPlayers.map(player => {
    //  console.log('Mapping Yahoo player: ', player.name.full);
    const rosteredPosition = player.selected_position || 'BEN';
    const slot = positionMap[rosteredPosition] ?? rosteredPosition;
     return {
       nfl_id: player.player_key,
       player_name: player.name.full,
       player_first_name: player.name.first,
       player_last_name: player.name.last,
       position_type: player.selected_position,
       nfl_team_name: player.editorial_team_abbr,
       roster_slot: slot
     };
  });
  
  // Get a list of all players from the DB based on the ESPN IDs.
  const nflPlayers: PlayerData[] = await getNflPlayersFromPlayerList(playerList, 'yahoo');
  return nflPlayers;

};

export async function getYahooLeague(leagueId: string, yf:any): Promise<League | null> {
      const league = await getLeagueKey(leagueId.toString(), yf);
    if (!league){
        return null;
    }
    const leagueKey = league.key;
    const leagueName = league.name;
    const teams = await getTeamsInLeague(leagueKey, yf);
    const leagueTeams: Team[] = await Promise.all(teams.map(async (team: YahooTeam) => {
      // console.log('Processing team: ', team.name);
      console.log(`Processing team: ${team.name} (ID: ${team.team_id}) with ${team.team_logos} logos.`, team.team_logos[0].url);
      const roster = await mapYahooPlayersToPlayerData(team.roster);
      return {
        team_key: team.team_key,
        external_team_id: team.team_id,
        name: team.name,
        description: `Managed by ${team.managers[0]?.nickname}`,
        owner: team.managers[0]?.nickname || 'Unknown',
        logo_url: team.team_logos && team.team_logos.length > 0 ? team.team_logos[0].url : undefined,
        roster: roster
      } as Team;
    }));
    return {
      league_name: leagueName,
      teams: leagueTeams
    };
}

const getTeamsInLeague = async (leagueKey: string, yf:any): Promise<YahooTeam[]> => {
  try {
    // The league key format is "game_id.l.league_id".
    // For a 2024 NFL league with ID 12345, the key would be "430.l.12345"
    // Use `yf.user.game_teams('nfl')` to find your league IDs.
    const league = await yf.league.teams(leagueKey);
    const teams: YahooTeam[] = [];
    //console.log(`Teams in league "${league.name}":`, league);
    //console.log('first team' , league.teams[0].managers);
    for (const team of league.teams) {
        //console.log('TEAM - ', team);
        const team_key = team.team_key;

       // console.log(`- ${team.name} (Team ID: ${team.team_id})`);
        const roster = await yf.roster.players(team_key);
        //console.log(` Roster for team ${team.name} : `, roster.roster);
        const playerRoster : YahooPlayer[] = roster.roster.map(p => {
          let playerName = p.name.full
          if (p.selected_position === 'DEF')
            {
              const teamName = p.editorial_team_abbr.toUpperCase();
                playerName = `${teamName} Defense`;
            }
          return {
            player_key: p.player_key,
            name: p.name,
            editorial_team_full_name: p.editorial_team_full_name,
            editorial_team_abbr: p.editorial_team_abbr,
            position_type: p.position_type,
            selected_position: p.selected_position
          } as YahooPlayer;
        });
        teams.push( {
            team_key: team.team_key,
            team_id: team.team_id,
            name: team.name,
            managers: team.managers,
            team_logos: team.team_logos,
            roster: playerRoster
        } as YahooTeam);
    }
    return teams;
  } catch (err) {
    console.error('Error fetching teams:', err);
  }
  return [];
};

const getLeagueKey = async (leagueId: string, yf:any) : Promise <Record<string, string> | null> => {
    const gameKey = 'nfl';
    console.log(`Fetching leagues and teams for game: ${gameKey}`);
  try {
    const userGames = await yf.user.game_leagues(gameKey);
    // console.log(`Found games for user.`, userGames);
    // console.log(' Here are the teams ', userGames.games[0].leagues);
    for (const game of userGames.games) {
      if (game.leagues) {
        for (const league of game.leagues) {
            if (league.league_id === leagueId) {
                const leagueName = league.name;
                const leagueKey = league.league_key;
                return {
                  name: leagueName,
                  key: leagueKey
                };
            }
        }
      }
    }
  } catch (err) {
    console.error('Error fetching leagues and teams:', err);
  }
  return null;
};

export async function getYahoochedule(userTeams: any, leagueTeams: Team[], yf:any): Promise<RawSchedule> {
  // Yahoo's scoringPeriodId starts at 0 for the first week, so we subtract 1
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
    // 1. FETCH ALL MATCHUPS AND STORE UNIQUELY
  const uniqueMatchupsMap = new Map<string, RawMatchup & { week: number }>();
    for (const team of leagueTeams) {
        
        const team_key = team.team_key;
        const team_id = team.external_team_id !== undefined ? parseInt(String(team.external_team_id)) : NaN;
        console.log(`\nTeam: ${team.name} (Team ID: ${team_id}, Team Key: ${team_key})`);
        const matchupsResults = await yf.team.matchups(team_key);
        const matchups = matchupsResults.matchups;

        for (const m of matchups) {
                // console.log(` Matchup: `, m);
                const week = parseInt(String(m.week));
                // Find the opponent's ID
                const opponentTeam = m.teams.find(t => parseInt(t.team_id) !== team_id);
                if (opponentTeam) {
                    //console.log(` Week ${week} vs ${opponentTeam.name} (Opponent Team ID: ${opponentTeam.team_id})`, opponentTeam);
                    const opponentTeamId = opponentTeam.team_id; 
                    const mappedOpponentUserId = teamIdToUserIdMap.get(parseInt(opponentTeamId));
                    const mappedTeamUserId = teamIdToUserIdMap.get(team_id);
                    if (!mappedOpponentUserId || !mappedTeamUserId) {
                        console.warn(`Could not find user IDs for teams in matchup: ${team.name} vs opponent ID ${opponentTeamId}`);
                        continue;
                    }
                    //console.log(` MAPPED Week ${week}: vs ${opponentTeam.name} (Opponent User ID: ${mappedOpponentUserId}, Team User ID: ${mappedTeamUserId})`);
                    // To ensure uniqueness, we always order the team IDs alphabetically or numerically
                    // for the key, regardless of which team's schedule we are looking at.
                    const id1 = Math.min(mappedTeamUserId, mappedOpponentUserId);
                    const id2 = Math.max(mappedTeamUserId, mappedOpponentUserId);
                    const key = `${week}_${id1}_${id2}`;
                    if (!uniqueMatchupsMap.has(key)) {
                        // If this is a new unique matchup, add it to our map
                        uniqueMatchupsMap.set(key, { 
                            week: week, 
                            teamA: id1, // Assigning the smaller ID to teamA for consistency
                            teamB: id2, // Assigning the larger ID to teamB for consistency
                        });
                    }
                }
            }
        }
        // 2. GROUP AND FORMAT INTO RawSchedule
        const groupedByWeek = new Map<number, RawMatchup[]>();
        // Transfer the unique matchups from the map to a structure grouped by week
        for (const matchup of uniqueMatchupsMap.values()) {
            const { week, teamA, teamB } = matchup;
            if (!groupedByWeek.has(week)) {
                groupedByWeek.set(week, []);
            }   
            groupedByWeek.get(week)!.push({ teamA, teamB });
        }

        // 3. CONVERT TO FINAL ARRAY FORMAT
        const rawSchedule: RawSchedule = [];
        // Ensure the rounds are sorted by week number
        const sortedWeeks = Array.from(groupedByWeek.keys()).sort((a, b) => a - b);

        for (const week of sortedWeeks) {
            rawSchedule.push({
                matchups: groupedByWeek.get(week)!,
            });
        }
      console.log('Final RawSchedule (Grouped by Round):', rawSchedule);
      return rawSchedule;
}