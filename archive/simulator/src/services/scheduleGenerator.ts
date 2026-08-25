import { supabase } from './supabaseClient';
import { TablesInsert } from './supabase'; // Import the generated types for insertion

// Define the types for your database IDs
// We'll leverage Supabase's generated types where possible
type GameWeekTeamId = number; // Assuming 'id' is a number
type GameWeekId = number;     // Assuming 'id' is a number

// Interface for a single match (simplified for internal logic)
interface Match {
    homeTeamId: GameWeekTeamId;
    awayTeamId: GameWeekTeamId;
}

// Interface for a single week's schedule (simplified for internal logic)
interface WeekSchedule {
    weekNumber: number;
    matches: Match[];
}

// Interface for the complete season schedule (simplified for internal logic)
interface SeasonSchedule {
    gameWeekId: GameWeekId; // The ID of the current game week being scheduled
    schedules: WeekSchedule[];
}

/**
 * Generates a round-robin schedule for a given list of game week team IDs.
 *
 * @param gameWeekTeamIds An array of game week team IDs participating in the league.
 * @param gameWeekId The ID of the current game week (from the game_weeks table).
 * @param totalWeeks The total number of weeks to schedule matchups for.
 * @returns A SeasonSchedule object containing the schedule for each week.
 */
function generateRoundRobinSchedule(
    gameWeekTeamIds: GameWeekTeamId[],
    gameWeekId: GameWeekId,
    totalWeeks: number
): SeasonSchedule {
    const numTeams = gameWeekTeamIds.length;
    const schedule: WeekSchedule[] = [];

    // If there's an odd number of teams, add a "bye" team to simplify scheduling.
    // The team playing against the "bye" team has a week off.
    const teams = [...gameWeekTeamIds];
    const hasBye = numTeams % 2 !== 0;
    if (hasBye) {
        teams.push(0); // Using 0 as a placeholder for a "bye" team.
    }

    const effectiveNumTeams = teams.length; // Will be even now

    // A single round-robin schedule (each team plays every other team once)
    // requires `effectiveNumTeams - 1` weeks.
    // We will generate `totalWeeks` by repeating this pattern.
    const weeksPerRound = effectiveNumTeams - 1;

    for (let week = 0; week < totalWeeks; week++) {
        const currentWeekMatches: Match[] = [];

        const fixedTeam = teams[0];
        const rotatingTeams = teams.slice(1);

        const rotatedTeams = [
            ...rotatingTeams.slice(week % rotatingTeams.length),
            ...rotatingTeams.slice(0, week % rotatingTeams.length)
        ];

        if (!hasBye) {
            currentWeekMatches.push({
                homeTeamId: fixedTeam,
                awayTeamId: rotatedTeams[rotatedTeams.length - 1]
            });
        }

        for (let i = 0; i < rotatedTeams.length / 2; i++) {
            const team1 = rotatedTeams[i];
            const team2 = rotatedTeams[rotatedTeams.length - 1 - i];

            if (team1 !== 0 && team2 !== 0) {
                if ((week + i) % 2 === 0) {
                    currentWeekMatches.push({ homeTeamId: team1, awayTeamId: team2 });
                } else {
                    currentWeekMatches.push({ homeTeamId: team2, awayTeamId: team1 });
                }
            }
        }
        schedule.push({ weekNumber: week + 1, matches: currentWeekMatches });
    }

    return { gameWeekId, schedules: schedule };
}

/**
 * Inserts the generated schedule into the Supabase database.
 * Uses the imported 'supabase' client and generated types.
 *
 * @param schedule The generated season schedule.
 * @returns A promise that resolves when all insertions are complete.
 */
async function insertScheduleIntoDb(
    schedule: SeasonSchedule
): Promise<void> {
    const recordsToInsert: TablesInsert<'game_week_matchups'>[] = [];

    for (const weekSchedule of schedule.schedules) {
        console.log(`Preparing matches for Game Week ID: ${schedule.gameWeekId}, Week Number: ${weekSchedule.weekNumber}`);
        for (const match of weekSchedule.matches) {
            // Prepare the record using the generated type for insertion
            recordsToInsert.push({
                game_week_id: schedule.gameWeekId,
                home_game_week_team_id: match.homeTeamId,
                away_game_week_team_id: match.awayTeamId,
                home_team_score: 0.00, // Default initial score
                away_team_score: 0.00, // Default initial score
                // created_at and updated_at will be set by the DB default/trigger
            });
        }
    }

    // Supabase allows bulk inserts by passing an array of objects
    // The `onConflict` option handles the `DO NOTHING` equivalent
    const { data, error } = await supabase
        .from('game_week_matchups')
        .upsert(recordsToInsert, {
            onConflict: 'game_week_id,home_game_week_team_id,away_game_week_team_id',
            ignoreDuplicates: true // This is the equivalent of `DO NOTHING`
        })
        .select(); // It's good practice to .select() to get data or errors

    if (error) {
        console.error('Error inserting schedule into database:', error.message);
        throw error;
    } else {
        console.log(`Successfully inserted/updated ${data?.length || 0} schedule entries.`);
    }
}

// --- Example Usage ---

async function main() {
    // 1. Fetch `game_week_team_ids` for a specific game week from Supabase
    //    In a real application, you'd probably fetch these dynamically.
    //    For demonstration, let's mock them or fetch them.
    const currentSeasonGameWeekId = 1; // Example: Assuming this game week exists
    const totalWeeksInSeason = 10;   // Example: Schedule for 10 weeks

    // Fetch team IDs for the specific game week
    const { data: gameWeekTeamsData, error: gameWeekTeamsError } = await supabase
        .from('game_week_teams')
        .select('id')
        .eq('game_week_id', currentSeasonGameWeekId);

    if (gameWeekTeamsError) {
        console.error('Error fetching game week teams:', gameWeekTeamsError.message);
        return;
    }

    const mockGameWeekTeamIds: GameWeekTeamId[] = gameWeekTeamsData.map(team => team.id);

    if (mockGameWeekTeamIds.length < 2) {
        console.warn("Not enough teams to generate a schedule (minimum 2).");
        return;
    }

    const generatedSchedule = generateRoundRobinSchedule(
        mockGameWeekTeamIds,
        currentSeasonGameWeekId,
        totalWeeksInSeason
    );

    console.log("Generated Schedule (for preview, not actual DB values):", JSON.stringify(generatedSchedule, null, 2));

    // 2. Insert the generated schedule into the database
    try {
        await insertScheduleIntoDb(generatedSchedule);
        console.log('Schedule generation and insertion process completed successfully!');
    } catch (error) {
        console.error('An error occurred during schedule processing:', error);
    }
}

// Execute the main function
main();