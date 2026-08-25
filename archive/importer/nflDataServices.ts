import { SupabaseClient, createClient } from '@supabase/supabase-js';
import {UserRosterInsert, GameWeekTeamPlayerInsert} from "./types.js"; // Import types from types.ts

// --- Supabase Configuration ---
// process.env will now be typed more strongly if env.d.ts is set up
const SUPABASE_URL: string = process.env.SUPABASE_URL || 'YOUR_SUPABASE_URL';
const SUPABASE_SERVICE_KEY: string = process.env.SUPABASE_SERVICE_ROLE_KEY || 'YOUR_SERVICE_KEY';
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  // Optional: You might want to specify schema or other options
  auth: {
    persistSession: false, // Prevents storing session in memory/localStorage, important for serverless
  }
});

export async function mapNFLIdtoPlayerId(nflIdsToFetch: string[]): Promise<Map<string, number>> {

    console.log(`Attempting to fetch ${nflIdsToFetch.length} nfl_player IDs for mapping.`);

    const playerIdToDbIdMap = new Map();
    const BATCH_SIZE = 500; // Adjust this number based on testing (e.g., 100, 250, 500, 1000)

    for (let i = 0; i < nflIdsToFetch.length; i += BATCH_SIZE) {
        const batch = nflIdsToFetch.slice(i, i + BATCH_SIZE);
        console.log(`Fetching batch ${Math.floor(i / BATCH_SIZE) + 1} of ${Math.ceil(nflIdsToFetch.length / BATCH_SIZE)} (size: ${batch.length})...`);

        try {
            const { data: currentPlayersBatch, error: fetchBatchError } = await supabase
                .from('nfl_players')
                .select('id, nfl_id')
                .in('nfl_id', batch);

            if (fetchBatchError) {
                console.error(`Error fetching nfl_players for ID map (Batch ${Math.floor(i / BATCH_SIZE) + 1}):`, fetchBatchError.message);
                throw fetchBatchError; // Re-throw to halt if a batch fails
            }

            currentPlayersBatch.forEach(p => {
                playerIdToDbIdMap.set(p.nfl_id, p.id);
            });
            console.log(`Successfully fetched ${currentPlayersBatch.length} players in batch. Total mapped: ${playerIdToDbIdMap.size}`);

        } catch (error) {
            console.error('An error occurred during batch fetching:', error);
            throw error; // Propagate the error up
        }
    }
    return playerIdToDbIdMap;
}

/**
 * Inserts distinct teams into the nfl_teams table.
 * @param {Array<Object>} allPlayers - Array of all player data from CSVs.
 */
export async function insertDistinctTeams(allPlayers: Array<{ Team: string }>): Promise<void> {
    console.log('Inserting distinct teams...');
    const distinctTeams = [...new Set(allPlayers.map(p => p.Team))].map(name => ({
        name: name,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
    }));

    if (distinctTeams.length === 0) {
        console.log('No new teams to insert.');
        return;
    }

    const { error } = await supabase
        .from('nfl_teams')
        .upsert(distinctTeams, { onConflict: 'name', ignoreDuplicates: true }); // 'name' must have a UNIQUE constraint!

    if (error) {
        console.error('Error inserting distinct teams:', error.message);
        throw error;
    }
    console.log(`Inserted/updated ${distinctTeams.length} distinct teams.`);
}

/**
 * Inserts distinct players into the nfl_players table and returns a map of PlayerId to nfl_player_id.
 * @param {Array<Object>} allPlayers - Array of all player data from CSVs.
 * @returns {Promise<Map<string, number>>} - Map of player_id (from CSV) to nfl_player_id (from DB).
 */
export async function insertDistinctPlayers(allPlayers: Array<{ playerid: string, playername: string, position: string, team: string }>): Promise<Map<string, number>> {
    console.log('Inserting distinct players...');
    const distinctPlayers:Record<string, { nfl_id: string, name: string, position_type: string, team_name: string, created_at: string, updated_at: string }> = {};
    allPlayers.forEach(p => {
        if (p.playerid && !distinctPlayers[p.playerid]) { // Ensure PlayerId exists
            distinctPlayers[p.playerid] = {
                nfl_id: String(p.playerid), // nfl_id is VARCHAR, ensure consistency
                name: p.playername,
                position_type: p.position,
                team_name: p.team, // Temporarily store team_name to join with nfl_teams later
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            };
        }
    });

    const playerRecords = Object.values(distinctPlayers);
    if (playerRecords.length === 0) {
        console.log('No new players to insert.');
        return new Map();
    }

    // Fetch nfl_team_ids
    const teamNames = [...new Set(playerRecords.map(p => p.team_name))];
    const { data: teamsData, error: teamsError } = await supabase
        .from('nfl_teams')
        .select('id, name')
        .in('name', teamNames);

    if (teamsError) {
        console.error('Error fetching nfl_teams:', teamsError.message);
        throw teamsError;
    }

    const teamNameToIdMap = new Map(teamsData.map(team => [team.name, team.id]));

    const playersToInsert = playerRecords.map(p => ({
        nfl_id: p.nfl_id,
        name: p.name,
        position_type: p.position_type,
        nfl_team_id: teamNameToIdMap.get(p.team_name), // Get ID from map
        created_at: p.created_at,
        updated_at: p.updated_at
    }));

    const { error: insertError } = await supabase
        .from('nfl_players')
        .upsert(playersToInsert, { onConflict: 'nfl_id', ignoreDuplicates: true }); // 'nfl_id' must have a UNIQUE constraint!

    if (insertError) {
        console.error('Error inserting distinct players:', insertError.message);
        throw insertError;
    }
    console.log(`Inserted/updated ${playersToInsert.length} distinct players.`);
    console.log(playersToInsert.map(p => p.nfl_id));
    const nflIdsToFetch = playersToInsert.map(p => p.nfl_id);
    console.log(`Attempting to fetch ${nflIdsToFetch.length} nfl_player IDs for mapping.`);

    const playerIdToDbIdMap = new Map();
    const BATCH_SIZE = 500; // Adjust this number based on testing (e.g., 100, 250, 500, 1000)

    for (let i = 0; i < nflIdsToFetch.length; i += BATCH_SIZE) {
        const batch = nflIdsToFetch.slice(i, i + BATCH_SIZE);
        console.log(`Fetching batch ${Math.floor(i / BATCH_SIZE) + 1} of ${Math.ceil(nflIdsToFetch.length / BATCH_SIZE)} (size: ${batch.length})...`);

        try {
            const { data: currentPlayersBatch, error: fetchBatchError } = await supabase
                .from('nfl_players')
                .select('id, nfl_id')
                .in('nfl_id', batch);

            if (fetchBatchError) {
                console.error(`Error fetching nfl_players for ID map (Batch ${Math.floor(i / BATCH_SIZE) + 1}):`, fetchBatchError.message);
                throw fetchBatchError; // Re-throw to halt if a batch fails
            }

            currentPlayersBatch.forEach(p => {
                playerIdToDbIdMap.set(p.nfl_id, p.id);
            });
            console.log(`Successfully fetched ${currentPlayersBatch.length} players in batch. Total mapped: ${playerIdToDbIdMap.size}`);

        } catch (error) {
            console.error('An error occurred during batch fetching:', error);
            throw error; // Propagate the error up
        }
    }
    //const playerIdToDbIdMap = new Map(currentPlayers.map(p => [p.nfl_id, p.id]));
    return playerIdToDbIdMap;
}

export async function insertRosterData(roster:UserRosterInsert[]): Promise<void> {
    console.log(`Attempting to insert ${roster.length} records into 'user_roster' table...`);
    const { error: insertError } = await supabase
        .from('user_roster')
        .insert(roster);

    if (insertError) {
        console.error('Error inserting into user_roster:', insertError.message);
    } else {
        console.log('Successfully inserted draft results into user_roster!');
    }
}

export async function getGameWeekId(gameWeek: string, seasonYear: string): Promise<number> {
    let gameWeekId;
    try {
        const { data: gameWeekData, error: gwError } = await supabase
            .from('game_weeks')
            .select('id')
            .eq('number', parseInt(gameWeek))
            .eq('season_year', parseInt(seasonYear))
            .single();

        if (gwError && gwError.code === 'PGRST116') { // No rows found
            console.log(`Game week ${gameWeek} for season ${seasonYear} not found. Creating new game_week entry.`);
            const { data: newGw, error: newGwError } = await supabase
                .from('game_weeks')
                .insert({ number: parseInt(gameWeek),
                     season_year: parseInt(seasonYear) })
                .select('id')
                .single();
            if (newGwError) {
                console.error('Error creating new game_week:', newGwError.message);
                throw newGwError;
            }
            gameWeekId = newGw.id;
            console.log(`Created game_week ${gameWeek} with ID: ${gameWeekId}`);
        } else if (gwError) {
            console.error('Error fetching game_week:', gwError.message);
            throw gwError;
        } else {
            gameWeekId = gameWeekData.id;
            console.log(`Using existing game_week ${gameWeek} with ID: ${gameWeekId}`);
        }
    } catch (error) {
        console.error('Failed to get/create game_week ID. Aborting.', error);
        process.exit(1);
    }
    return gameWeekId;
}

export async function getGameWeekTeam(gameWeekId: number, teamId: number): Promise<number | null> {
    let gameWeekTeamId: number | null = null;
    try {
        const { data: gameWeekData, error: gwError } = await supabase
            .from('game_week_teams')
            .select('id')
            .eq('game_week_id', gameWeekId)
            .eq('user_id', teamId)
            .single();
            if (gwError && gwError.code === 'PGRST116') { // No rows found
            console.log(`Game weekID  ${gameWeekId} for team ${teamId} not found. Creating new game_week_team entry.`);
            const { data: newGw, error: newGwError } = await supabase
                .from('game_week_teams')
                .insert({ game_week_id: gameWeekId, user_id: teamId })
                .select('id')
                .single();
            if (newGwError) {
                console.error('Error creating new game_week_teams:', newGwError.message);
                throw newGwError;
            }
            gameWeekTeamId = newGw.id;
            console.log(`Created game_week_teams ${gameWeekId} with ID: ${gameWeekTeamId}`);
        } else if (gwError) {
            console.error('Error fetching game_week:', gwError.message);
            throw gwError;
        } else {
            gameWeekTeamId = gameWeekData.id;
            console.log(`Using existing game_week ${gameWeekId} with ID: ${gameWeekTeamId}`);
        }
    } catch (error) {
        console.error('Error fetching game week team:', error);
        process.exit(1);
    }
    return gameWeekTeamId;
}

export async function insertGameWeekPlayers(roster: GameWeekTeamPlayerInsert[]): Promise<void> {
    console.log(`Attempting to insert ${roster.length} records into 'game_week_team_players' table...`);
    const { error: insertError } = await supabase
        .from('game_week_team_players')
        .insert(roster);

    if (insertError) {
        console.error('Error inserting into game_week_team_players:', insertError.message);
    } else {
        console.log('Successfully inserted week results into game_week_team_players!');
    }
}
