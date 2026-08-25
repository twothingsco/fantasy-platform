import { supabase } from '../supabaseClient.ts';

const FANTASY_SCHEMA = 'public'; // Define your schema name here

/**
 * @typedef {Object} Matchup
 * @property {number} teamA The ID of the home team (user_id).
 * @property {number} teamB The ID of the away team (user_id).
 *
 * @typedef {Object} Round
 * @property {Matchup[]} matchups An array of matchups for this round.
 *
 * @type {Round[]}
 */
export type RawSchedule = {
  matchups: {
    teamA: number;
    teamB: number;
  }[];
}[];

/**
 * Generates a round-robin schedule for a given list of unique team identifiers (e.g., user_ids).
 * This function determines WHO plays WHOM in each round, not the specific game_week_team_id.
 *
 * @param teamIdentifiers An array of unique identifiers for the teams (e.g., user_ids).
 * @returns An array of objects, where each object represents a round (game week)
 * and contains an array of matchups for that round.
 * Each matchup is an object with 'teamA' and 'teamB'.
 */
function generateRoundRobinMatchups(teamIdentifiers: number[]): Array<{ round: number; matchups: Array<{ teamA: number; teamB: number }> }> {
  const numTeams = teamIdentifiers.length;

  if (numTeams < 2) {
    console.warn("Not enough teams to generate a schedule.");
    return [];
  }

  const teams = [...teamIdentifiers];
  let isOdd = false;
  if (numTeams % 2 !== 0) {
    teams.push(-1); // Use -1 as a dummy for bye weeks
    isOdd = true;
  }

  const n = teams.length;
  const numRounds = n - 1; // Each team plays every other team once
  const schedule: Array<{ round: number; matchups: Array<{ teamA: number; teamB: number }> }> = [];

  for (let round = 0; round < numRounds; round++) {
    const matchupsForRound: Array<{ teamA: number; teamB: number }> = [];
    for (let i = 0; i < n / 2; i++) {
      const teamA = teams[i];
      const teamB = teams[n - 1 - i];

      if (teamA !== -1 && teamB !== -1) { // Only add if neither is the dummy bye team
        matchupsForRound.push({ teamA: teamA, teamB: teamB });
      }
    }

    schedule.push({ round: round + 1, matchups: matchupsForRound });

    // Rotate teams: Keep the first team fixed, rotate the rest.
    const lastTeam = teams.pop();
    if (lastTeam !== undefined) {
      teams.splice(1, 0, lastTeam);
    }
  }
 // console.log('[generateRoundRobinMatchups] schedule ', schedule);
  return schedule;
}

/**
 * Fetches game week teams for a specific league and generates/inserts the schedule for all weeks.
 *
 * @param leagueId The ID of the league for which to generate the schedule.
 * @param numberOfGameWeeks The total number of game weeks for the league (e.g., 10).
 */
// export async function generateAndInsertLeagueSchedule(leagueId: number) {
//   try {
//     // 1. Fetch ALL game week teams for the given league to get all user_ids and their game_week_team.id mappings
//     const { data: allGameWeekTeams, error: fetchError } = await supabase
//       .schema(FANTASY_SCHEMA)
//       .from('game_week_teams')
//       .select('id, user_id, game_week_id')
//       .eq('league_id', leagueId)
//       .order('user_id') // Order for consistency, though not strictly required by round-robin algo
//       .order('game_week_id');

//     if (fetchError) {
//       console.error('Error fetching game week teams:', fetchError.message);
//       return;
//     }

//     if (!allGameWeekTeams || allGameWeekTeams.length === 0) {
//       console.warn(`No game week teams found for league ID ${leagueId}. Cannot generate schedule.`);
//       return;
//     }
//     // extract unique game_week_id
//     //console.log('[generateAndInsertLeagueSchedule] allGameWeekTeams ', allGameWeekTeams);
//     const uniqueGameWeekIds = Array.from(new Set(allGameWeekTeams.map(gwt => gwt.game_week_id))).sort((a, b) => a - b);
//     const numberOfGameWeeks = uniqueGameWeekIds.length;
//     //console.log('[generateAndInsertLeagueSchedule] uniqueGameWeekIds ' , uniqueGameWeekIds);
//     //console.log("[generateAndInsertLeagueSchedule] Number of game weeks to generate schedule", numberOfGameWeeks);
//     if (numberOfGameWeeks < 1){
//         console.warn(`Less then 1 GameWeek. `, allGameWeekTeams);
//     }

//     // Extract unique user_ids (the actual 'teams' that play each other)
//     const uniqueUserIds = Array.from(new Set(allGameWeekTeams.map(gwt => gwt.user_id))).sort((a, b) => a - b);

//     if (uniqueUserIds.length < 2) {
//       console.warn(`Less than 2 unique users in league ID ${leagueId}. Cannot generate schedule.`);
//       return;
//     }
//     // console.log("[generateAndInsertLeagueSchedule] Number of teams generate schedule", uniqueUserIds.length );
//     // Create a map for easy lookup: user_id -> game_week_id -> game_week_team.id
//     const userGameWeekTeamMap = new Map<number, Map<number, number>>();
//     for (const team of allGameWeekTeams) {
//       if (team.user_id !== null) {
//         if (!userGameWeekTeamMap.has(team.user_id)) {
//           userGameWeekTeamMap.set(team.user_id, new Map<number, number>());
//         }
//         if (team.game_week_id !== null){
//           userGameWeekTeamMap.get(team.user_id)?.set(team.game_week_id, team.id);
//         }
//       }
//     }

//     // 2. Generate the round-robin schedule based on unique user_ids
//     const rawSchedule = generateRoundRobinMatchups(uniqueUserIds as number[]); // Cast to number[] for safety

//     // 3. Prepare matchups for insertion, mapping raw schedule to specific game_week_team.id's
//     const matchupsToInsert: {
//         game_week_id: number;
//         home_game_week_team_id: number;
//         away_game_week_team_id: number;
//         home_team_score: number;
//         away_team_score: number;
//     }[] = [];

//     for (let week = 1; week <= numberOfGameWeeks; week++) {
//         const currentWeekId = uniqueGameWeekIds[week - 1] !== null && uniqueGameWeekIds[week - 1] !== undefined ? uniqueGameWeekIds[week - 1] as number : week; // Get the actual game_week_id for this iteration
//         // Determine which 'round' of the generated schedule corresponds to this 'game week'
//         // We use modulo to cycle through the rounds if numberOfGameWeeks > numRounds
//         const roundIndex = (week - 1) % rawSchedule.length;
//         const currentRoundMatchups = rawSchedule[roundIndex]?.matchups;

//         if (!currentRoundMatchups) {
//             console.warn(`No matchups generated for round ${roundIndex + 1}. Skipping week ${week}.`);
//             continue;
//         }

//         for (const matchup of currentRoundMatchups) {
//             const homeUser = matchup.teamA;
//             const awayUser = matchup.teamB;

//             // Get the specific game_week_team.id for the home and away users for THIS game_week
//             const homeGameWeekTeamId = userGameWeekTeamMap.get(homeUser)?.get(currentWeekId);
//             const awayGameWeekTeamId = userGameWeekTeamMap.get(awayUser)?.get(currentWeekId);

//             if (homeGameWeekTeamId && awayGameWeekTeamId) {
//                 matchupsToInsert.push({
//                     game_week_id: currentWeekId,
//                     home_game_week_team_id: homeGameWeekTeamId,
//                     away_game_week_team_id: awayGameWeekTeamId,
//                     home_team_score: 0.00,
//                     away_team_score: 0.00,
//                 });
//             } else {
//                 // This scenario indicates missing game_week_team entries for a user for a specific week.
//                 // It's crucial that game_week_teams exist for ALL users for ALL planned game weeks.
//                 console.warn(`Missing game_week_team_id for users ${homeUser} or ${awayUser} for game_week_id ${week}. Skipping matchup.`);
//             }
//         }
//     }

//     // 4. Insert the generated matchups into the fantasy.game_week_matchups table
//     if (matchupsToInsert.length > 0) {
//       const { data: insertData,error: insertError } = await supabase
//         .schema(FANTASY_SCHEMA)
//         .from('game_week_matchups')
//         .insert(matchupsToInsert)
//         .select();
//       if (insertError) {
//         console.error('Error inserting game week matchups:', insertError.message);
//       } else {
//         console.log(`Successfully generated and inserted ${matchupsToInsert.length} matchups for league ID ${leagueId} for ${numberOfGameWeeks} weeks.`);
//       }
//       //

//     } else {
//       console.log('No matchups to insert.');
//     }

//   } catch (error) {
//     console.error('An unexpected error occurred:', error);
//   }
// }

/**
 * Orchestrates the full schedule generation and insertion process for a league.
 * @param leagueId The ID of the league.
 */
export async function generateAndInsertLeagueSchedule(leagueId: number) {
  // 1. Fetch all teams to get the list of users (the teams to schedule)
  const { data: allGameWeekTeams, error: fetchError } = await supabase
      .schema(FANTASY_SCHEMA)
      .from('game_week_teams')
      .select('user_id')
      .eq('league_id', leagueId);

  if (fetchError || !allGameWeekTeams || allGameWeekTeams.length === 0) {
      console.error('Error fetching game week teams or none found.', fetchError);
      return;
  }
  
  // Extract unique user_ids (the actual 'teams' that play each other)
  const uniqueUserIds = Array.from(new Set(allGameWeekTeams.map(gwt => gwt.user_id))).sort((a, b) => a - b) as number[];

  if (uniqueUserIds.length < 2) {
    console.warn(`Less than 2 unique users in league ID ${leagueId}. Cannot generate schedule.`);
    return;
  }

  // 2. Generate the round-robin schedule
  // This function is now fully decoupled and can be tested separately.
  const rawSchedule: RawSchedule = generateRoundRobinMatchups(uniqueUserIds);
  
  // 3. Insert the matchups using the new dedicated function
  await insertLeagueMatchupsFromSchedule(leagueId, rawSchedule);
}

/**
 * Maps a generated round-robin schedule to specific game_week_team IDs and inserts them into the database.
 *
 * @param leagueId The ID of the league.
 * @param rawSchedule The pre-generated round-robin schedule (array of rounds/matchups based on user IDs).
 */
export async function insertLeagueMatchupsFromSchedule(
  leagueId: number,
  rawSchedule: RawSchedule
) {
  try {
    // 1. FETCH GAME WEEK TEAMS: This step MUST remain to define allGameWeekTeams
    //    and collect all the necessary 'game_week_team.id's for the mapping.
    const { data: allGameWeekTeams, error: fetchError } = await supabase
      .schema(FANTASY_SCHEMA)
      .from('game_week_teams')
      .select('id, user_id, game_week_id')
      .eq('league_id', leagueId)
      .order('user_id')
      .order('game_week_id');

    if (fetchError) {
      console.error('Error fetching game week teams:', fetchError.message);
      return;
    }

    if (!allGameWeekTeams || allGameWeekTeams.length === 0) {
      console.warn(`No game week teams found for league ID ${leagueId}. Cannot generate schedule.`);
      return;
    }
    
    // ... (The rest of the logic follows, using the data fetched above)

    // Extract unique game_week_id
    const uniqueGameWeekIds = Array.from(new Set(allGameWeekTeams.map(gwt => gwt.game_week_id))).sort((a, b) => a - b);
    const numberOfGameWeeks = uniqueGameWeekIds.length;
    
    // Extract unique user_ids (The teams we need to verify against the schedule)
    const uniqueUserIdsSet = new Set(
        allGameWeekTeams
        .map(gwt => gwt.user_id)
        .filter((id): id is number => id !== null) // Filter out nulls and type guard
    );
    // Create a map for easy lookup: user_id -> game_week_id -> game_week_team.id
    // ... (Map creation logic remains the same)
    const userGameWeekTeamMap = new Map<number, Map<number, number>>();
    for (const team of allGameWeekTeams) {
      if (team.user_id !== null) {
        if (!userGameWeekTeamMap.has(team.user_id)) {
          userGameWeekTeamMap.set(team.user_id, new Map<number, number>());
        }
        if (team.game_week_id !== null){
          userGameWeekTeamMap.get(team.user_id)?.set(team.game_week_id, team.id);
        }
      }
    } 
    // 2. Prepare matchups for insertion...
    // ... (The rest of the function continues from this point)
    // 3. Prepare matchups for insertion, mapping raw schedule to specific game_week_team.id's
    const matchupsToInsert: {
        game_week_id: number;
        home_game_week_team_ids: number[];
        away_game_week_team_ids: number[];
        home_team_score: number;
        away_team_score: number;
    }[] = [];

    for (let week = 1; week <= numberOfGameWeeks; week++) {
        const currentWeekId = uniqueGameWeekIds[week - 1] !== null && uniqueGameWeekIds[week - 1] !== undefined ? uniqueGameWeekIds[week - 1] as number : week; // Get the actual game_week_id for this iteration
        // Determine which 'round' of the generated schedule corresponds to this 'game week'
        // We use modulo to cycle through the rounds if numberOfGameWeeks > numRounds
        const roundIndex = (week - 1) % rawSchedule.length;
        const currentRoundMatchups = rawSchedule[roundIndex]?.matchups;

        if (!currentRoundMatchups) {
            console.warn(`No matchups generated for round ${roundIndex + 1}. Skipping week ${week}.`);
            continue;
        }

        for (const matchup of currentRoundMatchups) {
          // console.log(` LOOKING UP matchup`, matchup);

            const homeUser = matchup.teamA;
            const awayUser = matchup.teamB;
            
            if (!uniqueUserIdsSet.has(homeUser) || !uniqueUserIdsSet.has(awayUser)) {
                // If the schedule contains a user not in the league, throw an error
                throw new Error(
                    `Schedule integrity failure: User ID ${homeUser} or ${awayUser} not found in fetched league teams.`
                );
            }
            // Get the specific game_week_team.id for the home and away users for THIS game_week
            const homeGameWeekTeamIds = [userGameWeekTeamMap.get(homeUser)?.get(currentWeekId)];
            const awayGameWeekTeamIds = [userGameWeekTeamMap.get(awayUser)?.get(currentWeekId)];
            
            if (homeGameWeekTeamIds && awayGameWeekTeamIds) {
                matchupsToInsert.push({
                    game_week_id: currentWeekId,
                    home_game_week_team_ids: homeGameWeekTeamIds,
                    away_game_week_team_ids: awayGameWeekTeamIds,
                    home_team_score: 0.00,
                    away_team_score: 0.00,
                });
            } else {
                // This scenario indicates missing game_week_team entries for a user for a specific week.
                // It's crucial that game_week_teams exist for ALL users for ALL planned game weeks.
                console.warn(`Missing game_week_team_id for users ${homeUser} or ${awayUser} for game_week_id ${week}. Skipping matchup.`);
            }
        }
    }

    // 4. Insert the generated matchups into the fantasy.game_week_matchups table
    if (matchupsToInsert.length > 0) {
      const { data: insertData,error: insertError } = await supabase
        .schema(FANTASY_SCHEMA)
        .from('game_week_matchups')
        .insert(matchupsToInsert)
        .select();
      if (insertError) {
        console.error('Error inserting game week matchups:', insertError.message);
      } else {
        console.log(`Successfully generated and inserted ${matchupsToInsert.length} matchups for league ID ${leagueId} for ${numberOfGameWeeks} weeks.`);
      }
      //

    } else {
      console.log('No matchups to insert.');
    }
    
  } catch (error) {
    console.error('An unexpected error occurred:', error);
  }
}