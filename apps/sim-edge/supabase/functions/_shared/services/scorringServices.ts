// src/services/scoringService.ts
import { supabase } from '../supabaseClient.ts'; // Adjust path to your supabase client
import { PlayerData, TeamFantasyScore, IndividualPlayerFantasyScore } from './types.ts'; // Adjust path to your types

// Define return types for better type safety
// These types would ideally be generated if you're using `supabase gen types`
// If not generated, you can manually define them based on your SQL function RETURNS TABLE

/**
 * Calls the 'get_player_fantasy_scores' database function to get individual player scores.
 * This function is NOT league-specific.
 * @param gameWeekNumber The number of the game week (e.g., 1, 2, ...).
 * @param seasonYear The year of the season (e.g., 2023, 2024).
 * @param modeName The name of the scoring mode (e.g., 'ESPN', 'Yahoo').
 * @returns A promise resolving to an array of PlayerFantasyScore objects or an error.
 */
export async function getALLNFLPlayerFantasyScores(
    gameWeekNumber: number,
    seasonYear: number,
    modeName: string
): Promise<{ data: PlayerData[] | null; error: any }> {
    const { data, error } = await supabase.rpc('get_player_fantasy_scores', {
        p_game_week_number: gameWeekNumber,
        p_season_year: seasonYear,
        p_mode_name: modeName,
    });

    if (error) {
        console.error('Error fetching universal player fantasy scores:', error);
        return { data: null, error };
    }

    return { data: data as PlayerData[], error: null };
}



/**
 * Calls the 'get_team_fantasy_scores' database function to get aggregated team scores for a specific league.
 * @param gameWeekNumber The number of the game week (e.g., 1, 2, ...).
 * @param seasonYear The year of the season (e.g., 2023, 2024).
 * @param leagueId The ID of the league.
 * @returns A promise resolving to an array of TeamFantasyScore objects or an error.
 */
export async function getLLeagueScores(
    gameWeekNumber: number,
    seasonYear: number,
    leagueId: number
): Promise<{ data: TeamFantasyScore[] | null; error: any }> {
    const { data, error } = await supabase.rpc('get_team_fantasy_scores', {
        p_game_week_number: gameWeekNumber,
        p_season_year: seasonYear,
        p_league_id: leagueId,
    });

    if (error) {
        console.error('Error fetching team fantasy scores:', error);
        return { data: null, error };
    }

    return { data: data as TeamFantasyScore[], error: null };
}

/**
 * Calls the 'get_individual_player_fantasy_scores' database function to get detailed individual player scores within teams for a specific league.
 * @param gameWeekNumber The number of the game week (e.g., 1, 2, ...).
 * @param seasonYear The year of the season (e.g., 2023, 2024).
 * @param leagueId The ID of the league.
 * @returns A promise resolving to an array of IndividualPlayerFantasyScore objects or an error.
 */
export async function getDetailedLeagueScores(
    gameWeekNumber: number,
    seasonYear: number,
    leagueId: number
): Promise<{ data: IndividualPlayerFantasyScore[] | null; error: any }> {
    const { data, error } = await supabase.rpc('get_individual_player_fantasy_scores', {
        p_game_week_number: gameWeekNumber,
        p_season_year: seasonYear,
        p_league_id: leagueId,
    });

    if (error) {
        console.error('Error fetching detailed individual player fantasy scores:', error);
        return { data: null, error };
    }

    return { data: data as IndividualPlayerFantasyScore[], error: null };
}

/**
 * Calls the 'get_individual_player_fantasy_scores' database function to get detailed individual player scores within teams for a specific league.
 * @param gameWeekNumber The number of the game week (e.g., 1, 2, ...).
 * @param seasonYear The year of the season (e.g., 2023, 2024).
 * @param leagueId The ID of the league.
 * @returns A promise resolving to an array of IndividualPlayerFantasyScore objects or an error.
 */
export async function getTeamRosterScores(
    gameWeekNumber: number,
    seasonYear: number,
    leagueId: number
): Promise<{ data: IndividualPlayerFantasyScore[] | null; error: any }> {
    const { data, error } = await supabase.rpc('get_team_roster_with_scores', {
        p_game_week_number: gameWeekNumber,
        p_season_year: seasonYear,
        p_league_id: leagueId,
    });

    if (error) {
        console.error('Error fetching detailed individual player fantasy scores:', error);
        return { data: null, error };
    }

    return { data: data as IndividualPlayerFantasyScore[], error: null };
}