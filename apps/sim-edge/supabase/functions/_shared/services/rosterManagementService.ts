// rosterManagementServices.ts

import { supabase } from '../supabaseClient.ts';
import { TablesInsert, Tables, TablesUpdate } from '../supabase.ts'; // Import all necessary generated types
import { PlayerData } from '../GraphState_types.ts';
// --- Type Definitions using Supabase generated types ---
const FANTASY_SCHEMA='public';
/**
 * Interface for the fantasy.users table.
 */
type User = Tables< { schema: 'fantasy', table: 'users' }>;
type UserInsert = TablesInsert< { schema: 'fantasy', table: 'users' }>;
type UserUpdate = TablesUpdate<{ schema: 'fantasy', table: 'users' }>;

/**
 * Interface for the fantasy.nfl_players table.
 */
type NflPlayer = Tables<{ schema: 'fantasy', table: 'nfl_players' }>;
type NflPlayerInsert = TablesInsert< { schema: 'fantasy', table: 'nfl_players' }>;
type NflPlayerUpdate = TablesUpdate<{ schema: 'fantasy', table: 'nfl_players' }>;


/**
 * Interface for the fantasy.user_roster table (Draft Results).
 */
type UserRoster = Tables<{ schema: 'fantasy', table: 'user_roster' }>;
type UserRosterInsert = TablesInsert<{ schema: 'fantasy' , table: 'user_roster'}>;
type UserRosterUpdate = TablesUpdate<{ schema: 'fantasy', table: 'user_roster' }>;

/**
 * Interface for the fantasy.game_week_teams table.
 */
type GameWeekTeam = Tables<{ schema: 'fantasy', table: 'game_week_teams' }>;
type GameWeekTeamInsert = TablesInsert<{ schema: 'fantasy', table: 'game_week_teams' }>;
type GameWeekTeamUpdate = TablesUpdate<{ schema: 'fantasy', table: 'game_week_teams' }>;

/**
 * Interface for the fantasy.game_week_team_players table (Weekly Lineup Management).
 */
type GameWeekTeamPlayer = Tables<{ schema: 'fantasy', table: 'game_week_team_players' }>;
type GameWeekTeamPlayerInsert = TablesInsert<{ schema: 'fantasy', table: 'game_week_team_players' }>;
type GameWeekTeamPlayerUpdate = TablesUpdate<{ schema: 'fantasy', table: 'game_week_team_players'}>;

/**
 * Interface for the fantasy.game_weeks table.
 */
type GameWeek = Tables<{ schema: 'fantasy', table: 'game_weeks' }>;


// --- User Roster (Draft Results) CRUD Operations ---

/**
 * Adds a player to a user's roster for a specific season (simulating a draft pick).
 * @param userId The ID of the user.
 * @param nflPlayerId The ID of the NFL player.
 * @param seasonYear The season year for which the player is drafted.
 * @param teamName The user's team name at the time of draft (optional, can be null).
 * @returns The created UserRoster object or null if an error occurred.
 */
export async function createDraftResult(
    userId: number,
    nflPlayerId: number,
    seasonYear: number,
    teamName: string | null = null
): Promise<UserRoster | null> {
    try {
        const { data, error } = await supabase
            .schema(FANTASY_SCHEMA)
            .from('user_roster')
            .insert({ user_id: userId, nfl_player_id: nflPlayerId, team_name: teamName, season_year: seasonYear })
            .select()
            .single();

        if (error) {
            console.error('Error creating draft result:', error.message);
            return null;
        }
        return data;
    } catch (error) {
        console.error('Unexpected error creating draft result:', error);
        return null;
    }
}

/**
 * Retrieves a specific draft result by its ID.
 * @param id The ID of the user_roster entry.
 * @returns The UserRoster object or null if not found.
 */
export async function getDraftResultById(
    id: number
): Promise<UserRoster | null> {
    try {
        const { data, error } = await supabase
            .schema(FANTASY_SCHEMA)
            .from('user_roster')
            .select('*')
            .eq('id', id)
            .single();

        if (error) {
            if (error.code === 'PGRST116') { // No rows found
                return null;
            }
            console.error('Error getting draft result by ID:', error.message);
            return null;
        }
        return data;
    } catch (error) {
        console.error('Unexpected error getting draft result by ID:', error);
        return null;
    }
}

/**
 * Retrieves all players on a user's roster for a given season.
 * @param userId The ID of the user.
 * @param seasonYear The season year.
 * @returns An array of UserRoster objects, potentially joined with NFL player details.
 */
export async function getUserRoster(
    userId: number,
    seasonYear: number
): Promise<(UserRoster & { nfl_players: NflPlayer | null })[]> {
    try {
        const { data, error } = await supabase
          .schema(FANTASY_SCHEMA)
          .from('user_roster')
          .select(`
            id,
            team_name,
            season_year,
            created_at,
            updated_at,
            nfl_players (
              id,
              name,
              position_type,
              nfl_teams (
                name
              )
            )
          `)
          .eq('user_id', userId)
          .eq('season_year', seasonYear)
        if (error) {
            console.error('Error getting user roster:', error.message);
            return [];
        }
        return data as (UserRoster & { nfl_players: NflPlayer | null })[];
    } catch (error) {
        console.error('Unexpected error getting user roster:', error);
        return [];
    }
}

/**
 * Updates details of a player on a user's roster.
 * @param id The ID of the user_roster entry to update.
 * @param updates An object containing the fields to update (e.g., { team_name: 'New Team' }).
 * @returns The updated UserRoster object or null if not found or an error occurred.
 */
export async function updateUserRoster(
    id: number,
    updates: UserRosterUpdate
): Promise<UserRoster | null> {
    try {
        if (typeof updates !== 'object' || updates === null || Object.keys(updates).length === 0) {
            console.warn('No updates provided for user roster.');
            return null;
        }

        const { data, error } = await supabase
            .schema(FANTASY_SCHEMA)
            .from('user_roster')
            .update(updates)
            .eq('id', id)
            .select()
            .single();

        if (error) {
            console.error('Error updating user roster:', error.message);
            return null;
        }
        return data;
    } catch (error) {
        console.error('Unexpected error updating user roster:', error);
        return null;
    }
}

/**
 * Removes a player from a user's roster.
 * @param id The ID of the user_roster entry to delete.
 * @returns True if deletion was successful, false otherwise.
 */
export async function deleteUserRoster(
    id: number
): Promise<boolean> {
    try {
        const { error, count } = await supabase
            .schema(FANTASY_SCHEMA)
            .from('user_roster')
            .delete()
            .eq('id', id)
            .select('*', { count: 'exact' }); // Use select with count to check if a row was deleted

        if (error) {
            console.error('Error deleting user roster:', error.message);
            return false;
        }
        return (count || 0) > 0;
    } catch (error) {
        console.error('Unexpected error deleting user roster:', error);
        return false;
    }
}

/**
 * Adds a player to a specific game week team's lineup or bench.
 * @param gameWeekTeamId The ID of the game week team.
 * @param nflPlayerId The ID of the NFL player.
 * @param playing Boolean indicating if the player is in the starting lineup (true) or on the bench (false).
 * @param rosterSlot The specific roster slot (e.g., 'QB', 'RB', 'WR', 'FLEX', 'BENCH').
 * @returns The created GameWeekTeamPlayer object or null if an error occurred.
 */
export async function createGameWeekTeamPlayer(
    gameWeekTeamId: number,
    nflPlayerId: number,
    playing: boolean,
    rosterSlot: string
): Promise<GameWeekTeamPlayer | null> {
    try {
        const { data, error } = await supabase
            .schema(FANTASY_SCHEMA)
            .from('game_week_team_players')
            .insert({ game_week_team_id: gameWeekTeamId, nfl_player_id: nflPlayerId, playing: playing, roster_slot: rosterSlot })
            .select()
            .single();

        if (error) {
            console.error('Error creating game week team player:', error.message);
            return null;
        }
        return data;
    } catch (error) {
        console.error('Unexpected error creating game week team player:', error);
        return null;
    }
}

/**
 * Retrieves a specific game week team player entry by its ID.
 * @param id The ID of the game_week_team_players entry.
 * @returns The GameWeekTeamPlayer object or null if not found.
 */
export async function getGameWeekTeamPlayerById(
    id: number
): Promise<GameWeekTeamPlayer | null> {
    try {
        const { data, error } = await supabase
            .schema(FANTASY_SCHEMA)
            .from('game_week_team_players')
            .select('*')
            .eq('id', id)
            .single();

        if (error) {
            if (error.code === 'PGRST116') { // No rows found
                return null;
            }
            console.error('Error getting game week team player by ID:', error.message);
            return null;
        }
        return data;
    } catch (error) {
        console.error('Unexpected error getting game week team player by ID:', error);
        return null;
    }
}

/**
 * Retrieves all players assigned to a specific game week team.
 * @param gameWeekTeamId The ID of the game week team.
 * @returns An array of GameWeekTeamPlayer objects, potentially joined with NFL player details.
 */
export async function getGameWeekTeamPlayers(
    gameWeekTeamId: number
): Promise<(GameWeekTeamPlayer & { nfl_players: NflPlayer | null })[]> {
    try {
        const { data, error } = await supabase
            .schema(FANTASY_SCHEMA)
            .from('game_week_team_players')
            .select(`
                *,
                nfl_players (name, position_type)
            `)
            .eq('game_week_team_id', gameWeekTeamId)
            .order('playing', { ascending: false }) // Starters first
            .order('roster_slot', { ascending: true })
            .order('nfl_players.name', { ascending: true });

        if (error) {
            console.error('Error getting game week team players:', error.message);
            return [];
        }
        return data as (GameWeekTeamPlayer & { nfl_players: NflPlayer | null })[];
    } catch (error) {
        console.error('Unexpected error getting game week team players:', error);
        return [];
    }
}

/**
 * Updates details for a player in a game week team (e.g., playing status, roster slot).
 * @param id The ID of the game_week_team_players entry to update.
 * @param updates An object containing the fields to update (e.g., { playing: true, roster_slot: 'QB' }).
 * @returns The updated GameWeekTeamPlayer object or null if not found or an error occurred.
 */
export async function updateGameWeekTeamPlayer(
    id: number,
    updates: GameWeekTeamPlayerUpdate
): Promise<GameWeekTeamPlayer | null> {
    try {
        if (typeof updates !== 'object' || updates === null || Object.keys(updates).length === 0) {
            console.warn('No updates provided for game week team player.');
            return null;
        }

        const { data, error } = await supabase
            .schema(FANTASY_SCHEMA)
            .from('game_week_team_players')
            .update(updates)
            .eq('id', id)
            .select()
            .single();

        if (error) {
            console.error('Error updating game week team player:', error.message);
            return null;
        }
        return data;
    } catch (error) {
        console.error('Unexpected error updating game week team player:', error);
        return null;
    }
}

/**
 * Removes a player from a game week team's lineup/bench.
 * @param id The ID of the game_week_team_players entry to delete.
 * @returns True if deletion was successful, false otherwise.
 */
export async function deleteGameWeekTeamPlayer(
    id: number
): Promise<boolean> {
    try {
        const { error, count } = await supabase
            .schema(FANTASY_SCHEMA)
            .from('game_week_team_players')
            .delete()
            .eq('id', id)
            .select('*', { count: 'exact' });

        if (error) {
            console.error('Error deleting game week team player:', error.message);
            return false;
        }
        return (count || 0) > 0;
    } catch (error) {
        console.error('Unexpected error deleting game week team player:', error);
        return false;
    }
}

// --- Helper Functions for Draft Management ---

/**
 * Retrieves all NFL players.
 * @returns An array of NflPlayer objects.
 */
export async function getNFLPlayers(): Promise<NflPlayer[]> {
    try {
        const { data, error } = await supabase
            .schema(FANTASY_SCHEMA)
            .from('nfl_players')
            .select('*')
            .order('name', { ascending: true });

        if (error) {
            console.error('Error getting NFL players:', error.message);
            return [];
        }
        return data;
    } catch (error) {
        console.error('Unexpected error getting NFL players:', error);
        return [];
    }
}

/**
 * Retrieves all NFL players.
 * @returns An array of NflPlayer objects.
 */
export async function getNFLPlayersByName(names: string[]): Promise<NflPlayer[]> {
    try {
        const { data, error } = await supabase
            .schema(FANTASY_SCHEMA)
            .from('nfl_players')
            .select('id, name, position_type,  nfl_teams(name)')
            .in('name', names)
            .order('name', { ascending: true });

        if (error) {
            console.error('Error getting NFL players:', error.message);
            return [];
        }
        return data;
    } catch (error) {
        console.error('Unexpected error getting NFL players:', error);
        return [];
    }
}

export async function getMappedPlayersByName(names: string[]): Promise<PlayerData[]> {
    const players = await getNFLPlayersByName(names);
    return players.map((player: NflPlayer) => ({
        player_id: player.id,
        player_name: player.name,
        nfl_id: player.nfl_id,
        position_type: player.position_type,
        nfl_team_name: player.nfl_teams?.name
    }));
}

export async function getNflPlayersFromPlayerList(playerList: PlayerData[], keyType: string ): Promise<PlayerData[]> {
    const playerKeys = playerList.map(p => p.nfl_id.toString());
    const nflPlayersMap = await getNflPlayerIdMap(playerKeys, keyType);
    const teamMap = await getNflTeamIdMap()
    const nflPlayers: PlayerData[] = await Promise.all(playerList.map(p => {
        const mappedPlayer = nflPlayersMap[p.nfl_id.toString()];
        if (mappedPlayer) {
            return {...p,
                player_id: mappedPlayer.id,
                nfl_team_name: mappedPlayer.nfl_teams?.abbreviation
            };
        } else {
            console.warn(`No mapping found for player with ${keyType} ID: ${p.nfl_id}`, p);
            const newPlayer =  insertNewPlayer(p, teamMap, keyType);
            if ( newPlayer  ) {
                return newPlayer
            }
        }
    }));
    return nflPlayers;
}

async function insertPlayerMapping(nflId: string, keyType: string, externalKey: string, playerName: string) {
    const columnKey = keyType === 'espn' ? 'espn_player_key' : 'yahoo_player_key';
    const mappingInsert = {
      nfl_id: nflId,
      [columnKey]: externalKey,
      player_name: playerName
    }
    const { error: mapError } = await supabase
      .schema(FANTASY_SCHEMA)
      .from('nfl_player_mapping')
      .insert(mappingInsert);
  
    if (mapError) { console.error('Error inserting player mapping:', mapError.message); }
  }

export async function getNflPlayerIdMap(playerKeys: string[], keyType: string): Promise<{ [key: string]: PlayerData }> {
 
    const keyColumn = keyType === 'espn' ? 'espn_player_key' : 'yahoo_player_key';
  const { data: data, error: error } = await supabase
    .schema(FANTASY_SCHEMA)
    .from('nfl_player_mapping')
    .select(
        `${keyColumn},
        nfl_players ( id, name, nfl_id, position_type, nfl_teams(name, abbreviation) )
        ` )
    .in(keyColumn, playerKeys); // 3. Filter using the dynamic key column
   
  if (error) {
    console.error('Error fetching nfl_player_mapping:', error.message);
    throw error;
  }
  const nflPlayerIdMap: { [key: string]: PlayerData } = {};
  data.forEach(player => {
    if (player.nfl_players !== null) {
      const player_key = (player)[keyColumn]; // Access the dynamic key column
      nflPlayerIdMap[player_key] = player.nfl_players;
    }
  });

  return nflPlayerIdMap;
}

/**
 * Fetches the NFL team name to ID map from the database.
 * Caches the result to avoid repeated calls.
 * @returns A map of NFL team names to their database IDs.
 */
export async function getNflTeamIdMap(): Promise<{ [key: string]: number }> {
  const teamNameToIdMap: { [key: string]: number } = {};
  const { data: teamsData, error: teamsError } = await supabase
    .schema(FANTASY_SCHEMA)
    .from('nfl_teams')
    .select('id, abbreviation');

  if (teamsError) {
    console.error('Error fetching nfl_teams:', teamsError.message);
    throw teamsError;
  }

  teamsData.forEach(team => {
    if (team.abbreviation !== null) {
      teamNameToIdMap[team.abbreviation] = team.id;
    }
  });

  return teamNameToIdMap;
}

/**
 * Inserts a new NFL player into the database if no match is found.
 * @param player The player data to insert.
 * @param teamNameToIdMap A map to convert team names to IDs.
 * @returns The newly created player's data.
 */
export async function insertNewPlayer(player: PlayerData, teamNameToIdMap: { [key: string]: number }, source: string = 'genius'): Promise<PlayerData> {
  const insertPlayer = {
    name: player.player_name,
    firstname: player.player_first_name || '',
    lastname: player.player_last_name || '',
    nfl_id: player.nfl_id.toString(),
    position_type: player.position_type,
    nfl_team_id: teamNameToIdMap[player.nfl_team_name.toUpperCase()] || null,
    source: source
  };

  console.log('NO MATCH FOUND - Inserting new player:', insertPlayer);
  const { data: newPlayer, error: insertError } = await supabase
    .schema(FANTASY_SCHEMA)
    .from('nfl_players')
    .insert(insertPlayer)
    .select('id, nfl_id, name, position_type, nfl_teams(abbreviation, name)');

  if (insertError) {
    console.error('Error inserting distinct players:', insertError.message);
    throw insertError;
  }
  if ( source !== 'genius' && insertPlayer.nfl_id ) {
    // insert mapping
    insertPlayerMapping(insertPlayer.nfl_id.toString(), source, insertPlayer.nfl_id.toString(), insertPlayer.name);
  }

  console.log('Inserted new player:', newPlayer);

  return {
    ...player,
    player_name: newPlayer[0]?.name ?? player.player_name,
    player_id: newPlayer[0]?.id,
    position_type: newPlayer[0]?.position_type ?? player.position_type,
    nfl_team_name: newPlayer[0]?.nfl_teams?.name ?? player.nfl_team_name
  };
}

/**
 * A centralized function to look up, match, and insert players.
 * @param player The player data from the source.
 * @param nflPlayers A list of existing NFL players from the DB.
 * @param teamNameToIdMap A map to convert team names to IDs.
 * @returns The matched or newly created player's data.
 */
export async function findOrCreatePlayer(player: PlayerData, nflPlayers: PlayerData[], teamNameToIdMap: { [key: string]: number }): Promise<PlayerData> {
  const matchedPlayer = nflPlayers.find(np => np.player_name === player.player_name);
  if (matchedPlayer) {
    return {
      ...player,
      player_id: matchedPlayer.player_id,
      position_type: matchedPlayer.position_type,
      nfl_team_name: matchedPlayer.nfl_team_name
    };
  } else {
    return await insertNewPlayer(player, teamNameToIdMap);
  }
}

/**
 * Checks if a player is already drafted in a specific league for a given season.
 * This assumes a player can only be drafted once per league per season.
 * @param nflPlayerId The ID of the NFL player.
 * @param leagueId The ID of the league.
 * @param seasonYear The season year.
 * @returns True if the player is drafted, false otherwise.
 */
export async function isPlayerDraftedInLeague(
    nflPlayerId: number,
    leagueId: number,
    seasonYear: number
): Promise<boolean> {
    try {
        const { data, error } = await supabase
            .schema(FANTASY_SCHEMA)
            .from('user_roster')
            .select(`
                id,
                user_leagues!inner(league_id)
            `)
            .eq('nfl_player_id', nflPlayerId)
            .eq('season_year', seasonYear)
            .eq('user_leagues.league_id', leagueId)
            .limit(1); // Only need to find one match

        if (error) {
            console.error('Error checking if player is drafted in league:', error.message);
            return false;
        }
        return (data?.length || 0) > 0;
    } catch (error) {
        console.error('Unexpected error checking if player is drafted in league:', error);
        return false;
    }
}

/**
 * Create the roster from the draft results
 * @param p_league_id
 * @param p_season_year
 * @returns
 */
export async function createRosterFromDraft(p_league_id: number, p_season_year: number) {
    const { data, error } = await supabase
    .rpc('create_user_roster_from_draft', {
        p_league_id: p_league_id, 
        p_season_year: p_season_year
    })
    if (error) console.error(error)
    else return data;
}
/**
 * Creates multiple draft results (user roster entries) in a batch.
 * @param userId The ID of the user.
 * @param seasonYear The season year for which the players are drafted.
 * @param nflPlayerIds An array of NFL player IDs to be drafted.
 * @param teamName The user's team name at the time of draft (optional, can be null).
 * @returns An array of created UserRoster objects or null if an error occurred.
 */
export async function batchCreateRoster(
    userId: number,
    seasonYear: number,
    nflPlayerIds: number[],
    teamName: string | null = null
): Promise<UserRoster[] | null> {
    try {
        if (nflPlayerIds.length === 0) {
            console.warn('No NFL player IDs provided for batch roster creation.');
            return [];
        }

        const inserts: UserRosterInsert[] = nflPlayerIds.map(nflPlayerId => ({
            user_id: userId,
            nfl_player_id: nflPlayerId,
            team_name: teamName,
            season_year: seasonYear
        }));
        console.log("ABOUT TO INSTER ", inserts);
        const { error } = await supabase
            .schema(FANTASY_SCHEMA)
            .from('user_roster')
            .insert(inserts)

        if (error) {
            console.error('Error creating batch user roster:', error);
            return null;
        }
        return null;
    } catch (error) {
        console.error('Unexpected error creating batch user roster:', error);
        return null;
    }
}


// --- Helper Functions for Weekly Management ---

/**
 * Retrieves the game_week_team_id for a given user, league, game week number, and season year.
 * If no team exists for the given criteria, it attempts to create one.
 * This is crucial for managing weekly lineups as players are assigned to a game_week_team_id.
 * @param userId The ID of the user.
 * @param leagueId The ID of the league.
 * @param gameWeekNumber The game week number.
 * @param seasonYear The season year.
 * @returns The GameWeekTeam object or null if an error occurred.
 */
export async function getOrCreateGameWeekTeamForUser(
    userId: number,
    leagueId: number,
    gameWeekNumber: number,
    seasonYear: number
): Promise<GameWeekTeam | null> {
    try {
        // First, find the game_week_id
        const { data: gameWeekData, error: gameWeekError } = await supabase
            .schema(FANTASY_SCHEMA)
            .from('game_weeks')
            .select('id')
            .eq('number', gameWeekNumber)
            .eq('season_year', seasonYear)
            .single();

        if (gameWeekError) {
            if (gameWeekError.code === 'PGRST116') {
                console.error(`Game week ${gameWeekNumber} for season ${seasonYear} not found.`);
            } else {
                console.error('Error finding game week ID:', gameWeekError.message);
            }
            return null;
        }
        const gameWeekId = gameWeekData.id;
        // Then, try to find an existing game_week_team
        const { data: teamData, error: teamError } = await supabase
            .schema(FANTASY_SCHEMA)
            .from('game_week_teams')
            .select('*')
            .eq('user_id', userId)
            .eq('league_id', leagueId)
            .eq('game_week_id', gameWeekId)
            .single();

        if (teamError) {
            if (teamError.code === 'PGRST116') { // No rows found, so create
                const { data: createData, error: createError } = await supabase
                    .schema(FANTASY_SCHEMA)
                    .from('game_week_teams')
                    .insert({ user_id: userId, league_id: leagueId, game_week_id: gameWeekId })
                    .select()
                    .single();

                if (createError) {
                    console.error('Error creating game week team:', createError.message);
                    return null;
                }
                return createData;
            }
            console.error('Error getting game week team:', teamError.message);
            return null;
        }
        return teamData; // Return existing team
    } catch (error) {
        console.error('Unexpected error getting or creating game week team for user:', error);
        return null;
    }
}

/**
 * Sets the 'playing' status of a player for a specific game week.
 * This is used to move players between starting lineup and bench.
 * @param gameWeekTeamPlayerId The ID of the game_week_team_players entry.
 * @param playingStatus True for starting, false for bench.
 * @returns The updated GameWeekTeamPlayer object or null if an error occurred.
 */
export function setPlayerPlayingStatus(
    gameWeekTeamPlayerId: number,
    playingStatus: boolean
): Promise<GameWeekTeamPlayer | null> {
    return updateGameWeekTeamPlayer(gameWeekTeamPlayerId, { playing: playingStatus });
}

/**
 * Assigns a player to a specific roster slot for a game week.
 * @param gameWeekTeamPlayerId The ID of the game_week_team_players entry.
 * @param rosterSlot The new roster slot (e.g., 'QB', 'RB', 'WR', 'FLEX', 'BENCH').
 * @returns The updated GameWeekTeamPlayer object or null if an error occurred.
 */
export function assignPlayerRosterSlot(
    gameWeekTeamPlayerId: number,
    rosterSlot: string
): Promise<GameWeekTeamPlayer | null> {
    return updateGameWeekTeamPlayer(gameWeekTeamPlayerId, { roster_slot: rosterSlot });
}

/**
 * Moves a player from one roster slot to another within the same game week team.
 * @param gameWeekTeamId The ID of the game week team.
 * @param nflPlayerId The ID of the NFL player to move.
 * @param newRosterSlot The new roster slot for the player.
 * @returns The updated GameWeekTeamPlayer object or null if not found or an error occurred.
 */
export async function movePlayerBetweenSlots(
    gameWeekTeamId: number,
    nflPlayerId: number,
    newRosterSlot: string
): Promise<GameWeekTeamPlayer | null> {
    try {
        // Find the specific game_week_team_player entry for this player in this game week team
        const { data: findData, error: findError } = await supabase
            .schema(FANTASY_SCHEMA)
            .from('game_week_team_players')
            .select('*')
            .eq('game_week_team_id', gameWeekTeamId)
            .eq('nfl_player_id', nflPlayerId)
            .single();

        if (findError) {
            if (findError.code === 'PGRST116') {
                console.warn(`Player ${nflPlayerId} not found in game week team ${gameWeekTeamId}.`);
            } else {
                console.error('Error finding game week team player for move:', findError.message);
            }
            return null;
        }

        const gameWeekTeamPlayerId = findData.id;

        // Determine new 'playing' status based on newRosterSlot
        const newPlayingStatus = newRosterSlot.toUpperCase() !== 'BENCH';

        // Update the player's slot and playing status
        const updatedPlayer = await updateGameWeekTeamPlayer(
            gameWeekTeamPlayerId,
            { roster_slot: newRosterSlot, playing: newPlayingStatus }
        );
        return updatedPlayer;
    } catch (error) {
        console.error('Unexpected error moving player between slots:', error);
        return null;
    }
}

/**
 * Retrieves the full roster for a game week team, including player details,
 * sorted by playing status (starters first) and then by roster slot.
 * @param gameWeekTeamId The ID of the game week team.
 * @returns An array of player objects with detailed information.
 */
export async function getFullGameWeekRosterDetails(
    gameWeekTeamId: number
): Promise<(GameWeekTeamPlayer & { nfl_players: NflPlayer | null })[]> {
    try {
        const { data, error } = await supabase
            .schema(FANTASY_SCHEMA)
            .from('game_week_team_players')
            .select(`
                *,
                nfl_players (*)
            `)
            .eq('game_week_team_id', gameWeekTeamId)
            .order('playing', { ascending: false }) // Starters first
            .order('roster_slot', { ascending: true })
            .order('nfl_players.name', { ascending: true });

        if (error) {
            console.error('Error getting full game week roster details:', error.message);
            return [];
        }
        return data as (GameWeekTeamPlayer & { nfl_players: NflPlayer | null })[];
    } catch (error) {
        console.error('Unexpected error getting full game week roster details:', error);
        return [];
    }
}

/**
 * Represents the data needed to insert a game week team player in a batch.
 */
interface BatchGameWeekPlayerInsert {
    nflPlayerId: number;
    playing: boolean;
    rosterSlot: string;
}

/**
 * Creates multiple game week team player entries in a batch.
 * @param gameWeekTeamId The ID of the game week team to which these players belong.
 * @param playersToInsert An array of objects, each containing nflPlayerId, playing status, and rosterSlot.
 * @returns An array of created GameWeekTeamPlayer objects or null if an error occurred.
 */
export async function batchCreateGameWeekTeamPlayers(
    gameWeekTeamId: number,
    playersToInsert: BatchGameWeekPlayerInsert[]
): Promise<GameWeekTeamPlayer[] | null> {
    try {
        // Prepare the payload for the RPC call
        const rpcPayload = {
            p_game_week_team_id: gameWeekTeamId,
            // The players array must be sent as a JSON string or object
            p_players_to_insert: playersToInsert, 
        };

        const { data, error } = await supabase
            // Call the Postgres function by its name
            .rpc('replace_game_week_roster', rpcPayload);

        if (error) {
            console.error('Error calling replace_game_week_roster RPC:', error.message);
            // If an error occurred here, the DELETE was rolled back, and the old roster remains.
            return null;
        }

        // The data returned by the RPC is the result of the final INSERT query (RETURNING *)
        return data as GameWeekTeamPlayer[]; 
    } catch (error) {
        console.error('Unexpected error replacing game week team roster (RPC):', error);
        return null;
    }
}
