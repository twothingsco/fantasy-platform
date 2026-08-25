import { supabase } from '../supabaseClient.ts';
import { PlayerData } from './types.ts'; // Adjust path to your types

const FANTASY_SCHEMA = 'public';

/**
 * Populate the snake draft
 */
export async function populateDraftPicks(p_league_id: number, p_season_year: number) {
    let { data, error } = await supabase
        .rpc('populate_snake_draft', {
            p_league_id,
            p_season_year
        })
    if (error) console.error(error)
    else console.log(data);
}
/**
 * Fetches the next available draft pick for a given league and season,
 * along with the total number of rounds and picks in the draft.
 *
 * @param {number} leagueId - The ID of the fantasy league.
 * @param {number} seasonYear - The year of the fantasy season.
 * @returns {object|null} The next draft pick object with total draft info, or null if no pending picks exist.
 */
export async function getNextDraftPick(leagueId: number, seasonYear: number) {
    try {
        // Correctly fetching the count using a separate call.
        const { count: totalPicksCount, error: totalPicksError } = await supabase
            .schema(FANTASY_SCHEMA) // Ensure we're using the correct schema
            .from('draft_picks')
            .select('*', { count: 'exact', head: true })
            .eq('league_id', leagueId)
            .eq('season_year', seasonYear);

        if (totalPicksError) {
            console.error('Error fetching total picks count:', totalPicksError);
            return null;
        }

        // Get the next pending pick
        const { data: pickData, error: pickError } = await supabase
            .schema(FANTASY_SCHEMA) // Ensure we're using the correct schema
            .from('draft_picks')
            .select(`
        id,
        league_id,
        user_id,
        users(
          name,
          team_name,
          team_description
        ),
        season_year,
        round_number,
        pick_number
      `)
            .eq('league_id', leagueId)
            .eq('season_year', seasonYear)
            .eq('status', 'pending')
            .order('pick_number', { ascending: true })
            .limit(1);

        if (pickError) {
            console.error('Error fetching next draft pick:', pickError);
            return null;
        }

        console.log('Total picks count:', totalPicksCount);

        // Process the results
        if (pickData && pickData.length > 0) {
            const pick = pickData[0];

            const nextPick = {
                status: 'drafting',
                pick_id: pick.id,
                league_id: pick.league_id,
                user_id: pick.user_id,
                user_name: pick.users.name,
                team_name: pick.users.team_name,
                team_description: pick.users.team_description,
                season_year: pick.season_year,
                round_number: pick.round_number,
                pick_number: pick.pick_number,
                total_picks: totalPicksCount || 0,
            };

            return nextPick;
        }
        if (totalPicksCount > 0) {
            return {
                status: 'complete',
                total_picks: totalPicksCount
            };
        }

        return null;
    } catch (err) {
        console.error('An unexpected error occurred:', err);
        return null;
    }
}
/**
 *  * This function updates the status of the draft pick to 'active'.
 * It is typically called when a user starts making a pick in the draft.
 *
 * @param {number} pick_id The ID of the draft pick to start.
 * @returns {Promise<any>} The updated draft pick data or null if an error occurred.
 */
export async function startPick(pick_id: number) {
    try {
        const { data, error } = await supabase
            .schema(FANTASY_SCHEMA) // Ensure we're using the correct schema
            .from('draft_picks')
            .update({ status: 'active' })
            .eq('id', pick_id);

        if (error) {
            throw error;
        }

        return data;
    } catch (err) {
        console.error('Error starting pick:', err);
        return null;
    }
}

/**
 * Function to complete the draft pick by updating its status to 'completed'
 * and optionally updating the nfl_player_id if a player is selected.
 * @param {number} pick_id - The ID of the draft pick to complete.
 * @param {number} [nfl_player_id] - The NFL player ID if a player is selected.
 * @returns {Promise<any>} The updated draft pick data or null if an error occurred.
 */
export async function completePick(pick_id: number, nfl_player_id?: number) {
    try {
        const { data, error } = await supabase
            .schema(FANTASY_SCHEMA) // Ensure we're using the correct schema
            .from('draft_picks')
            .update({ status: 'complete', nfl_player_id })
            .eq('id', pick_id);

        if (error) {
            throw error;
        }

        return data;
    } catch (err) {
        console.error('Error completing pick:', err);
        return null;
    }
}

/**
 * Calls the 'get_player_fantasy_scores' database function to get individual player scores.
 * This function is NOT league-specific.
 * @param gameWeekNumber The number of the game week (e.g., 1, 2, ...).
 * @param seasonYear The year of the season (e.g., 2023, 2024).
 * @param modeName The name of the scoring mode (e.g., 'ESPN', 'Yahoo').
 * @returns A promise resolving to an array of PlayerFantasyScore objects or an error.
 */
export async function getDraftPool(
    gameWeekNumber: number,
    seasonYear: number,
    modeName: string
): Promise<{ data: PlayerData[] | null; error: any }> {
    const { data, error } = await supabase.rpc('get_draft_pool', {
        p_game_week_number: gameWeekNumber,
        p_season_year: seasonYear,
        p_mode_name: modeName,
    });

    if (error) {
        console.error('Error fetching Draft Pool:', error);
        return { data: null, error };
    }

    return { data: data as PlayerData[], error: null };
}

/**
 * Calls the 'get_player_fantasy_scores' database function to get individual player scores.
 * This function is NOT league-specific.
 * @param leagueId The ID of the league.
 * @param gameWeekNumber The number of the game week (e.g., 1, 2, ...).
 * @param seasonYear The year of the season (e.g., 2023, 2024).
 * @param modeName The name of the scoring mode (e.g., 'ESPN', 'Yahoo').
 * @returns A promise resolving to an array of PlayerFantasyScore objects or an error.
 */
export async function getAvailableDraftPool(
    leagueId: number,
    gameWeekNumber: number,
    seasonYear: number,
    modeName: string
): Promise<{ data: PlayerData[] | null; error: any }> {
    const { data, error } = await supabase.rpc('get_available_draft_pool', {
        p_league_id: leagueId,
        p_game_week_number: gameWeekNumber,
        p_season_year: seasonYear,
        p_mode_name: modeName,
    });

    if (error) {
        console.error('Error fetching Draft Pool:', error);
        return { data: null, error };
    }

    return { data: data as PlayerData[], error: null };
}

/**
 * Fetches the current drafted roster for a specific user.
 *
 * @param {number} draftPickId - The ID of a draft pick to determine the user.
 * @returns {Array<object>|null} An array of player objects on the roster, or null if an error occurs.
 */
export async function getDraftRoster(draftPickId: number): Promise<Array<{
    player_id: number;
    player_name: string;
    nfl_team_name: string;
    position_type: string;
}> | null> {
    try {
        // First, find the user_id associated with the provided draft pick ID
        const { data: pickData, error: pickError } = await supabase
            .schema(FANTASY_SCHEMA) // Ensure we're using the correct schema
            .from('draft_picks')
            .select('user_id')
            .eq('id', draftPickId)
            .single();

        if (pickError || !pickData) {
            console.error('Error fetching user_id for draft pick:', pickError);
            return null;
        }

        const userId = pickData.user_id;

        // Now, get all players drafted by that user, joining with nfl_players and nfl_teams
        const { data: rosterData, error: rosterError } = await supabase
            .schema(FANTASY_SCHEMA) // Ensure we're using the correct schema
            .from('draft_picks')
            .select(`
        nfl_player_id,
        nfl_players(
          name,
          position_type,
          nfl_teams(
            name
          )
        )
      `)
            .eq('user_id', userId)
            .not('nfl_player_id', 'is', null) // Only include completed picks
            .order('pick_number', { ascending: true });

        if (rosterError) {
            console.error('Error fetching roster:', rosterError);
            return null;
        }

        if (rosterData && rosterData.length > 0) {
            // Flatten the nested data into a cleaner format
            const roster = rosterData.map((pick: { nfl_player_id: any; nfl_players: { name: any; nfl_teams: { name: any; }; position_type: any; }; }) => ({
                player_id: pick.nfl_player_id,
                player_name: pick.nfl_players.name,
                nfl_team_name: pick.nfl_players.nfl_teams.name,
                position_type: pick.nfl_players.position_type,
            }));

            return roster;
        }

        return []; // Return an empty array if the user has no drafted players yet
    } catch (err) {
        console.error('An unexpected error occurred:', err);
        return null;
    }
}


/**
 * Calling the edge function to do a single draft pick.
 * @param {number} leagueId - The ID of the league.
 * @param {number} seasonYear - The year of the season.
 * @returns {Promise<any>} The result of the draft pick processing.
 */
export async function doDraftPick(leagueId: number, seasonYear: number) {
    try {
        const body = {
            season: seasonYear,
            leagueId: leagueId,
            currentWeek: 0 // default to zero for the draft
        };
        console.log('[doDraftPick] Invoking draft-pick Edge Function with body:', body);
        supabase.functions.invoke('draft-pick', {
            body: body
        });
        
        return;
    } catch (error) {
        console.error('Error in doDraftPick:', error);
        throw error;
    }
}

/**
 * Calling the edge function to Manage the draft game.
 * @param {number} leagueId - The ID of the league.
 * @param {number} seasonYear - The year of the season.
 * @returns {Promise<any>} The result of the draft pick processing.
 */
export async function doDRunDraft(leagueId: number, seasonYear: number){
    try {
        const body = {
            season: seasonYear,
            leagueId: leagueId,
            currentWeek: 0 // default to zero for the draft
        };
        supabase.functions.invoke('run-draft', {
            body: body
        });
        return ;
    } catch (error) {
        console.error('Error in doDRunDraft:', error);
        throw error;
    }
}