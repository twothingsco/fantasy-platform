import { supabase } from '../supabaseClient.ts';
import { Database, TablesInsert, Tables, TablesUpdate } from '../supabase.ts'; // Import all necessary generated types
import { Team } from '../GraphState_types.ts';
const FANTASY_SCHEMA = 'public'; // Define your schema name here
// Define specific types for convenience
type League = Tables<{ schema: 'fantasy'; table: 'leagues' }>;
type LeagueInsert = TablesInsert<{ schema: 'fantasy'; table: 'leagues' }>;
type LeagueUpdate = TablesUpdate<{ schema: 'fantasy'; table: 'leagues' }>;

type User = Tables<{ schema: 'fantasy'; table: 'users' }>;
type UserInsert = TablesInsert<{ schema: 'fantasy'; table: 'users' }>;
type UserUpdate = TablesUpdate<{ schema: 'fantasy'; table: 'users' }>;

type GameWeekTeam = Tables<{ schema: 'fantasy'; table: 'game_week_teams' }>;
type GameWeekTeamInsert = TablesInsert<{ schema: 'fantasy'; table: 'game_week_teams' }>;
type GameWeekTeamUpdate = TablesUpdate<{ schema: 'fantasy'; table: 'game_week_teams' }>;

type LeagueSettings = Tables<{ schema: 'fantasy'; table: 'league_settings' }>;
type LeagueSettingsInsert = TablesInsert<{ schema: 'fantasy'; table: 'league_settings' }>;

// New types for user_leagues
type UserLeague = Tables<{ schema: 'fantasy'; table: 'user_leagues' }>;
type UserLeagueInsert = TablesInsert<{ schema: 'fantasy'; table: 'user_leagues' }>;
type UserLeagueUpdate = TablesUpdate<{ schema: 'fantasy'; table: 'user_leagues' }>;

// // Team Data Types
// type Team = {
//     name: string;
//     description: string;
//     auth_user_id: string;
// };

type LeagueTeamsData = {
    teams: Team[];
};

/**
 * --- League Management Functions ---
 */

/**
 * Creates a new league and initializes its settings by copying from a default league (league_id = 1).
 * @param leagueName The name of the new league.
 * @param commissionerUserId The ID of the user who will be the commissioner of the new league.
 * @returns The newly created league object, or null if an error occurred.
 */
export async function createLeague(
  leagueName: string,
  commissionerUserId: number,
  leagueOptions: Record<string, any> = {},
  mode_id: number = 1 // Default to standard mode
): Promise<League | null> {
  try {
    // 1. Insert the new league
    const newLeagueData: LeagueInsert = {
      name: leagueName,
      commissioner_user_id: commissionerUserId,
      league_options: leagueOptions
    };

    const { data: newLeague, error: newLeagueError } = await supabase // Renamed 'leagueError' to 'newLeagueError'
      .schema(FANTASY_SCHEMA)  
      .from('leagues')
      .insert(newLeagueData)
      .select()
      .single();

    if (newLeagueError) { // Use newLeagueError here
      console.error('Error creating league:', newLeagueError.message);
      return null;
    }

    if (!newLeague) {
      console.error('New league data is null after insertion.');
      return null;
    }

    // 2. Fetch default league settings from 'Default League'
    // Corrected potential typo: 'league' to 'leagues'
    const { data: defaultLeagueData, error: defaultLeagueIdError } = await supabase // Renamed 'leagueData' to 'defaultLeagueData' and 'leagueError' to 'defaultLeagueIdError'
      .schema(FANTASY_SCHEMA)
      .from('leagues') // Changed from 'league' to 'leagues'
      .select('id')
      .eq('name', 'Default League')
      .single(); 

    if (defaultLeagueIdError) { // Use defaultLeagueIdError here
      console.error('Error fetching default league ID:', defaultLeagueIdError.message);
      return null;
    }

    if (!defaultLeagueData) {
      console.warn('No league found with name "Default League".');
      return null;
    }

    const defaultLeagueId = defaultLeagueData.id;

    const { data: defaultSettings, error: settingsError } = await supabase
      .schema(FANTASY_SCHEMA)
      .from('league_settings')
      .select('*')
      .eq('league_id', defaultLeagueId)
      .single();

    if (settingsError) {
      console.error('Error fetching default league settings:', settingsError.message);
      // Even if settings fail, the league was created, so return it
      return newLeague;
    }

    if (!defaultSettings) {
      console.warn('No default league settings found. New league created without settings.');
      return newLeague;
    }

    // 3. Prepare new league settings based on default settings
    const newLeagueSettings: LeagueSettingsInsert = {
      // Omit 'id' so Supabase generates a new one
      league_id: newLeague.id, // Link to the newly created league
      allow_trades: defaultSettings.allow_trades,
      bench_size: defaultSettings.bench_size,
      championship_week: defaultSettings.championship_week,
      draft_end_date: defaultSettings.draft_end_date,
      draft_order_reversed_after_round: defaultSettings.draft_order_reversed_after_round,
      draft_start_date: defaultSettings.draft_start_date,
      draft_type: defaultSettings.draft_type,
      faab_budget: defaultSettings.faab_budget,
      league_status: defaultSettings.league_status,
      mode_id: mode_id, // Use provided mode_id or default to 1
      num_playoff_teams: defaultSettings.num_playoff_teams,
      picks_per_round: defaultSettings.picks_per_round,
      playoff_start_week: defaultSettings.playoff_start_week,
      starting_lineup_size: defaultSettings.starting_lineup_size,
      // Ensure JSON type is handled correctly
      starting_position_requirements: defaultSettings.starting_position_requirements as Database['fantasy']['Tables']['league_settings']['Insert']['starting_position_requirements'],
      total_roster_size: defaultSettings.total_roster_size,
      trade_deadline: defaultSettings.trade_deadline,
      trade_review_period_hours: defaultSettings.trade_review_period_hours,
      waiver_run_day: defaultSettings.waiver_run_day,
      waiver_run_time: defaultSettings.waiver_run_time,
      waiver_type: defaultSettings.waiver_type,
      // created_at and updated_at are handled by Supabase defaults
    };

    // 4. Insert the new league settings
    const { error: insertSettingsError } = await supabase
      .schema(FANTASY_SCHEMA)
      .from('league_settings')
      .insert(newLeagueSettings);

    if (insertSettingsError) {
      console.error('Error inserting new league settings:', insertSettingsError.message);
      // The league was still created, so return it
      return newLeague;
    }

    console.log(`League "${newLeague.name}" created successfully with ID: ${newLeague.id} and default settings applied.`);
    return newLeague;

  } catch (error: any) {
    console.error('Unexpected error in createLeague:', error.message);
    return null;
  }
}
/**
 * Helper function to create a user and associate them with a league.
 * This is an internal helper and does not handle Supabase Auth user creation.
 * It's for creating the 'users' profile entry and 'user_leagues' entry.
 * @param leagueId The ID of the league to associate the user with.
 * @param teamName The name of the user's team.
 * @param teamDescription A description of the user's team.
 * @param user_id The auth_user_id from Supabase Auth (or a generated placeholder)
 * @returns The newly created user object, or null if an error occurred.
 */
async function createTeamUserAndAssociate(
    leagueId: number,
    teamName: string,
    teamDescription: string,
    user_id: string,
    role: 'member' | 'commissioner', // Allow specifying role
    season: number = 2024 // Default season if not provided
): Promise<User | null> {
    try {
       
        // 1. Create the association in 'user_leagues'
        const newUserLeague: UserLeagueInsert = {
            user_id: user_id, // Link to the user profile
            league_id: leagueId,
            role: role, // Use the provided role
        };

        const { error: userLeagueError } = await supabase
            .schema(FANTASY_SCHEMA)
            .from('user_leagues')
            .insert(newUserLeague);

        if (userLeagueError) {
            console.error('Error associating user with league:', userLeagueError.message);
            // Consider rolling back user creation here if the association is critical
            // For simplicity, we'll just log and return null for the whole operation
            return null;
        }

        //2. create the team associateion with game_week_teams
        console.log(`Creating game_week_teams for  "${teamName}" ...`);
        const { data: gameWeeks , error: gameWeeksError } = await supabase
            .schema(FANTASY_SCHEMA)
            .from('game_weeks')
            .select('*')
            .eq('season_year', season);
        if (gameWeeksError) { 
            console.error('Error fetching game weeks:', gameWeeksError.message);
            return null;
        }
        // loop through the game weeks and create a new entry for each

        for (const gameWeek of gameWeeks) {
            const newGameWeekTeam: GameWeekTeamInsert = {
                league_id: leagueId,
                user_id: user_id, // Link to the user profile
                game_week_id: gameWeek.id, // Use current week
            };
            const { error: gameWeekTeamError } = await supabase
                .schema(FANTASY_SCHEMA)
                .from('game_week_teams')
                .insert(newGameWeekTeam);

            if (gameWeekTeamError) {
                console.error('Error creating game week team association:', gameWeekTeamError.message);
                return null;
            }
        }

        console.log(`User "${teamName}" and league association created successfully.`);
        return newUserLeague;

    } catch (error: any) {
        console.error('Unexpected error in createTeamUserAndAssociate:', error.message);
        return null;
    }
}

/**
 * Sets up a new fantasy league with a given name and a list of teams.
 * The first team in the provided list will automatically be designated as the commissioner.
 * This function orchestrates the creation of the league, its settings, and the associated users (teams).
 * @param leagueName The name of the new league.
 * @param leagueTeams An Array containing list of team names and descriptions.
 * @returns The newly created league object, or null if an error occurred.
 */
export async function setupNewLeagueWithTeams(
    leagueName: string,
    leagueTeams: Team[] = [],
    season: number = 2024, // Default season if not provided
    leagueOptions: Record<string, any> = {},
    mode_id?: number
): Promise<League | null> {
    try {
        if (!leagueTeams || leagueTeams.length === 0) {
            console.error('No teams provided to set up the league.');
            return null;
        }

        // 1. Create all users (teams) first
        const createdUsers: User[] = [];
        for (const team of leagueTeams) {
            
            const createdUser = await createUser({ // Reusing the existing createUser for user profile
                auth_user_id: team.auth_user_id,
                team_name: team.name,
                team_description: team.description,
                name: team.owner ? team.owner : team.name, // Using team name as user name if no owner assigned
                logo_url: team.logo_url ? team.logo_url : null
            });

            if (createdUser) {
                createdUsers.push(createdUser);
            } else {
                console.warn(`Failed to create user profile for team "${team.name}". This team will be skipped.`);
                // Decide on error handling: should the whole operation fail if one user fails?
                // For now, we'll continue but log a warning.
            }
        }

        if (createdUsers.length === 0) {
            console.error('No users were successfully created. Cannot proceed with league creation.');
            return null;
        }

        // 2. Identify the commissioner: The first created user
        const commissionerUser= createdUsers[0] as User;
        console.log(`Designating "${commissionerUser.name}" (ID: ${commissionerUser.user_id}) as the commissioner.`);

        // 3. Create the new league using the first user's internal 'id' as commissioner_user_id
        const newLeague = await createLeague(leagueName, commissionerUser.user_id, leagueOptions, mode_id);

        if (!newLeague) {
            console.error('Failed to create new league after creating users.');
            return null;
        }

        console.log(`League "${newLeague.name}" created successfully with commissioner ${commissionerUser.name}.`);

        // 4. Associate all created users with the new league
        for (const user of createdUsers) {
            const role = (user.user_id === commissionerUser.user_id) ? 'commissioner' : 'member';
            const associatedUser = await createTeamUserAndAssociate(
                newLeague.id,
                user.team_name || user.name || 'Unnamed Team', // Fallback for name
                user.team_description || '', // Fallback for description
                user.user_id,
                role,
                season
            );

            if (!associatedUser) {
                console.warn(`Failed to associate user "${user.name}" with league.`);
            }
        }

        console.log(`League "${newLeague.name}" and all its teams set up successfully.`);
        //Add user list 
        newLeague.users = createdUsers;

        // // 5.generate the schedule.
        // await generateAndInsertLeagueSchedule (newLeague.id);
        return newLeague;

    } catch (error: any) {
        console.error('Unexpected error in setupNewLeagueWithTeams:', error.message);
        return null;
    }
}


/**
 * Retrieves a league by its ID.
 * @param leagueId The ID of the league to retrieve.
 * @returns The league object, or null if not found or an error occurred.
 */
export async function getLeagueById(leagueId: number): Promise<League | null> {
  try {
    const { data, error } = await supabase
      .schema(FANTASY_SCHEMA)
      .from('leagues')
      .select('*')
      .eq('id', leagueId)
      .single();

    if (error) {
      console.error('Error fetching league by ID:', error.message);
      return null;
    }
    return data;
  } catch (error: any) {
    console.error('Unexpected error in getLeagueById:', error.message);
    return null;
  }
}

/**
 * Retrieves all leagues.
 * @returns An array of league objects, or null if an error occurred.
 */
export async function getAllLeagues(): Promise<League[] | null> {
  try {
    const { data, error } = await supabase
      .schema(FANTASY_SCHEMA)
      .from('leagues')
      .select('*');

    if (error) {
      console.error('Error fetching all leagues:', error.message);
      return null;
    }
    return data;
  } catch (error: any) {
    console.error('Unexpected error in getAllLeagues:', error.message);
    return null;
  }
}

/**
 * Updates an existing league.
 * @param leagueId The ID of the league to update.
 * @param updates An object containing the fields to update.
 * @returns The updated league object, or null if not found or an error occurred.
 */
export async function updateLeague(
  leagueId: number,
  updates: LeagueUpdate
): Promise<League | null> {
  try {
    const { data, error } = await supabase
      .schema(FANTASY_SCHEMA)
      .from('leagues')
      .update(updates)
      .eq('id', leagueId)
      .select()
      .single();

    if (error) {
      console.error('Error updating league:', error.message);
      return null;
    }
    return data;
  } catch (error: any) {
    console.error('Unexpected error in updateLeague:', error.message);
    return null;
  }
}

/**
 * Deletes a league by its ID.
 * Note: This will likely fail if there are related records (e.g., in league_settings, user_leagues) due to foreign key constraints.
 * You might need to handle cascading deletes or delete related records first.
 * @param leagueId The ID of the league to delete.
 * @returns True if the league was deleted successfully, false otherwise.
 */
export async function deleteLeague(leagueId: number): Promise<boolean> {
  try {
    // Consider adding logic here to delete related records first (e.g., league_settings, user_leagues)
    // or set up cascading deletes in your Supabase database.
    const { error } = await supabase
      .schema(FANTASY_SCHEMA)
      .from('leagues')
      .delete()
      .eq('id', leagueId);

    if (error) {
      console.error('Error deleting league:', error.message);
      return false;
    }
    console.log(`League with ID ${leagueId} deleted successfully.`);
    return true;
  } catch (error: any) {
    console.error('Unexpected error in deleteLeague:', error.message);
    return false;
  }
}

/**
 * --- User Management Functions ---
 */

/**
 * Creates a new user.
 * Note: For real applications, user creation should typically go through Supabase Auth,
 * which handles password hashing and user management securely. This function is for
 * inserting into your 'users' public table, which might be for profile data linked to auth.
 * @param userData The data for the new user.
 * @returns The newly created user object, or null if an error occurred.
 */
export async function createUser(userData: UserInsert): Promise<User | null> {
  try {
    const { data, error } = await supabase
      .schema(FANTASY_SCHEMA)
      .from('users')
      .insert(userData)
      .select()
      .single();

    if (error) {
      console.error('Error creating user:', error.message);
      return null;
    }
    return data;
  } catch (error: any) {
    console.error('Unexpected error in createUser:', error.message);
    return null;
  }
}

/**
 * Retrieves a user by their ID.
 * @param userId The ID of the user to retrieve.
 * @returns The user object, or null if not found or an error occurred.
 */
export async function getUserById(userId: number): Promise<User | null> {
  try {
    const { data, error } = await supabase
      .schema(FANTASY_SCHEMA)
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();

    if (error) {
      console.error('Error fetching user by ID:', error.message);
      return null;
    }
    return data;
  } catch (error: any) {
    console.error('Unexpected error in getUserById:', error.message);
    return null;
  }
}

/**
 * Retrieves all users.
 * @returns An array of user objects, or null if an error occurred.
 */
export async function getAllUsers(): Promise<User[] | null> {
  try {
    const { data, error } = await supabase
      .schema(FANTASY_SCHEMA)
      .from('users')
      .select('*');

    if (error) {
      console.error('Error fetching all users:', error.message);
      return null;
    }
    return data;
  } catch (error: any) {
    console.error('Unexpected error in getAllUsers:', error.message);
    return null;
  }
}

/**
 * Updates an existing user.
 * @param userId The ID of the user to update.
 * @param updates An object containing the fields to update.
 * @returns The updated user object, or null if not found or an error occurred.
 */
export async function updateUser(
  userId: number,
  updates: UserUpdate
): Promise<User | null> {
  try {
    const { data, error } = await supabase
      .schema(FANTASY_SCHEMA)
      .from('users')
      .update(updates)
      .eq('id', userId)
      .select()
      .single();

    if (error) {
      console.error('Error updating user:', error.message);
      return null;
    }
    return data;
  } catch (error: any) {
    console.error('Unexpected error in updateUser:', error.message);
    return null;
  }
}

/**
 * Deletes a user by their ID.
 * Note: This will likely fail if there are related records (e.g., in user_leagues) due to foreign key constraints.
 * You might need to handle cascading deletes or delete related records first.
 * @param userId The ID of the user to delete.
 * @returns True if the user was deleted successfully, false otherwise.
 */
export async function deleteUser(userId: number): Promise<boolean> {
  try {
    // Consider adding logic here to delete related records first (e.g., user_leagues)
    // or set up cascading deletes in your Supabase database.
    const { error } = await supabase
      .schema(FANTASY_SCHEMA)
      .from('users')
      .delete()
      .eq('id', userId);

    if (error) {
      console.error('Error deleting user:', error.message);
      return false;
    }
    console.log(`User with ID ${userId} deleted successfully.`);
    return true;
  } catch (error: any) {
    console.error('Unexpected error in deleteUser:', error.message);
    return false;
  }
}

/**
 * --- Game Week Team Management Functions ---
 */

/**
 * Creates a new game week team.
 * @param teamData The data for the new game week team.
 * @returns The newly created game week team object, or null if an error occurred.
 */
export async function createGameWeekTeam(
  teamData: GameWeekTeamInsert
): Promise<GameWeekTeam | null> {
  try {
    const { data, error } = await supabase
      .schema(FANTASY_SCHEMA)
      .from('game_week_teams')
      .insert(teamData)
      .select()
      .single();

    if (error) {
      console.error('Error creating game week team:', error.message);
      return null;
    }
    return data;
  } catch (error: any) {
    console.error('Unexpected error in createGameWeekTeam:', error.message);
    return null;
  }
}

/**
 * Retrieves a game week team by its ID.
 * @param gameWeekTeamId The ID of the game week team to retrieve.
 * @returns The game week team object, or null if not found or an error occurred.
 */
export async function getGameWeekTeamById(
  gameWeekTeamId: number
): Promise<GameWeekTeam | null> {
  try {
    const { data, error } = await supabase
      .schema(FANTASY_SCHEMA)
      .from('game_week_teams')
      .select('*')
      .eq('id', gameWeekTeamId)
      .single();

    if (error) {
      console.error('Error fetching game week team by ID:', error.message);
      return null;
    }
    return data;
  } catch (error: any) {
    console.error('Unexpected error in getGameWeekTeamById:', error.message);
    return null;
  }
}

/**
 * Retrieves all game week teams for a specific league.
 * @param leagueId The ID of the league to filter game week teams by.
 * @returns An array of game week team objects, or null if an error occurred.
 */
export async function getGameWeekTeamsByLeagueId(
  leagueId: number
): Promise<GameWeekTeam[] | null> {
  try {
    const { data, error } = await supabase
      .schema(FANTASY_SCHEMA)
      .from('game_week_teams')
      .select('*')
      .eq('league_id', leagueId);

    if (error) {
      console.error('Error fetching game week teams by league ID:', error.message);
      return null;
    }
    return data;
  } catch (error: any) {
    console.error('Unexpected error in getGameWeekTeamsByLeagueId:', error.message);
    return null;
  }
}

/**
 * Updates an existing game week team.
 * @param gameWeekTeamId The ID of the game week team to update.
 * @param updates An object containing the fields to update.
 * @returns The updated game week team object, or null if not found or an error occurred.
 */
export async function updateGameWeekTeam(
  gameWeekTeamId: number,
  updates: GameWeekTeamUpdate
): Promise<GameWeekTeam | null> {
  try {
    const { data, error } = await supabase
      .schema(FANTASY_SCHEMA)
      .from('game_week_teams')
      .update(updates)
      .eq('id', gameWeekTeamId)
      .select()
      .single();

    if (error) {
      console.error('Error updating game week team:', error.message);
      return null;
    }
    return data;
  } catch (error: any) {
    console.error('Unexpected error in updateGameWeekTeam:', error.message);
    return null;
  }
}

/**
 * Deletes a game week team by its ID.
 * Note: This will likely fail if there are related records (e.g., in game_week_team_players) due to foreign key constraints.
 * You might need to handle cascading deletes or delete related records first.
 * @param gameWeekTeamId The ID of the game week team to delete.
 * @returns True if the game week team was deleted successfully, false otherwise.
 */
export async function deleteGameWeekTeam(gameWeekTeamId: number): Promise<boolean> {
  try {
    // Consider adding logic here to delete related records first (e.g., game_week_team_players)
    // or set up cascading deletes in your Supabase database.
    const { error } = await supabase
      .schema(FANTASY_SCHEMA)
      .from('game_week_teams')
      .delete()
      .eq('id', gameWeekTeamId);

    if (error) {
      console.error('Error deleting game week team:', error.message);
      return false;
    }
    console.log(`Game week team with ID ${gameWeekTeamId} deleted successfully.`);
    return true;
  } catch (error: any) {
    console.error('Unexpected error in deleteGameWeekTeam:', error.message);
    return false;
  }
}

/**
 * --- User League Management Functions ---
 */

/**
 * Creates a new user-league association.
 * @param userLeagueData The data for the new user-league association.
 * @returns The newly created user-league association object, or null if an error occurred.
 */
export async function createUserLeague(
  userLeagueData: UserLeagueInsert
): Promise<UserLeague | null> {
  try {
    const { data, error } = await supabase
      .schema(FANTASY_SCHEMA)
      .from('user_leagues')
      .insert(userLeagueData)
      .select()
      .single();

    if (error) {
      console.error('Error creating user league:', error.message);
      return null;
    }
    return data;
  } catch (error: any) {
    console.error('Unexpected error in createUserLeague:', error.message);
    return null;
  }
}

/**
 * Retrieves a user-league association by its ID.
 * @param userLeagueId The ID of the user-league association to retrieve.
 * @returns The user-league association object, or null if not found or an error occurred.
 */
export async function getUserLeagueById(
  userLeagueId: number
): Promise<UserLeague[] | null> {
  try {
    const { data, error } = await supabase
      .schema(FANTASY_SCHEMA)
      .from('user_leagues')
      .select(`*,
        users(name, team_name, team_description)`
      )
      .eq('league_id', userLeagueId);
    if (error) {
      console.error('Error fetching user league by ID:', error.message);
      return null;
    }

    console.log(`User league with ID ${userLeagueId} fetched successfully. ${data.length} records found.`);
    return data;
  } catch (error: any) {
    console.error('Unexpected error in getUserLeagueById:', error.message);
    return null;
  }
}

/**
 * Retrieves all user-league associations for a specific user.
 * This can be used to find all leagues a user belongs to.
 * @param userId The ID of the user to filter user-league associations by.
 * @returns An array of user-league association objects, or null if an error occurred.
 */
export async function getUserLeaguesByUserId(
  userId: number
): Promise<UserLeague[] | null> {
  try {
    const { data, error } = await supabase
      .schema(FANTASY_SCHEMA)
      .from('user_leagues')
      .select('*')
      .eq('user_id', userId);

    if (error) {
      console.error('Error fetching user leagues by user ID:', error.message);
      return null;
    }
    return data;
  } catch (error: any) {
    console.error('Unexpected error in getUserLeaguesByUserId:', error.message);
    return null;
  }
}

/**
 * Retrieves all user-league associations for a specific league.
 * This can be used to find all users belonging to a league.
 * @param leagueId The ID of the league to filter user-league associations by.
 * @returns An array of user-league association objects, or null if an error occurred.
 */
export async function getUserLeaguesByLeagueId(
  leagueId: number
): Promise<UserLeague[] | null> {
  try {
    const { data, error } = await supabase
      .schema(FANTASY_SCHEMA)
      .from('user_leagues')
      .select('*, users(name, team_name)') // Select user details along with the user_league data
      .eq('league_id', leagueId);

    if (error) {
      console.error('Error fetching user leagues by league ID:', error.message);
      return null;
    }
    return data;
  } catch (error: any) {
    console.error('Unexpected error in getUserLeaguesByLeagueId:', error.message);
    return null;
  }
}

/**
 * Updates an existing user-league association.
 * @param userLeagueId The ID of the user-league association to update.
 * @param updates An object containing the fields to update.
 * @returns The updated user-league association object, or null if not found or an error occurred.
 */
export async function updateUserLeague(
  userLeagueId: number,
  updates: UserLeagueUpdate
): Promise<UserLeague | null> {
  try {
    const { data, error } = await supabase
      .schema(FANTASY_SCHEMA)
      .from('user_leagues')
      .update(updates)
      .eq('id', userLeagueId)
      .select()
      .single();

    if (error) {
      console.error('Error updating user league:', error.message);
      return null;
    }
    return data;
  } catch (error: any) {
    console.error('Unexpected error in updateUserLeague:', error.message);
    return null;
  }
}

/**
 * Deletes a user-league association by its ID.
 * @param userLeagueId The ID of the user-league association to delete.
 * @returns True if the user-league association was deleted successfully, false otherwise.
 */
export async function deleteUserLeague(userLeagueId: number): Promise<boolean> {
  try {
    const { error } = await supabase
      .schema(FANTASY_SCHEMA)
      .from('user_leagues')
      .delete()
      .eq('id', userLeagueId);

    if (error) {
      console.error('Error deleting user league:', error.message);
      return false;
    }
    console.log(`User league with ID ${userLeagueId} deleted successfully.`);
    return true;
  } catch (error: any) {
    console.error('Unexpected error in deleteUserLeague:', error.message);
    return false;
  }
}

/** 
 * Retrieve all of the league settings for a specific league.
 * @param leagueId The ID of the league to retrieve settings for.
 * @returns The league settings object, or null if not found or an error occurred.
 */
export async function getLeagueSettingsByLeagueId(
  leagueId: number    
): Promise<LeagueSettings | null> {
  try {
    const { data, error } = await supabase
      .schema(FANTASY_SCHEMA)
      .from('league_settings')
      .select('*')
      .eq('league_id', leagueId)
      .single();

    if (error) {
      console.error('Error fetching league settings by league ID:', error.message);
      return null;
    }
    return data;
  } catch (error: any) {
    console.error('Unexpected error in getLeagueSettingsByLeagueId:', error.message);
    return null;
  }
}

/** 
 * update the league setting status
 * @param leagueId The ID of the league to retrieve settings for.
 * @param status the status that league is set to
 * @returns the leage settings object
 */
export async function updateLeageStatus(
  leagueId: number,
  status: string  
): Promise<LeagueSettings | null> {
  try {
    const { data, error } = await supabase
      .schema(FANTASY_SCHEMA)
      .from('league_settings')
      .update({'league_status': status})
      .eq('league_id', leagueId)
      .single();

    if (error) {
      console.error('Error updateing league status by league ID:', error.message);
      return null;
    }
    console.log('[updateLeageStatus] data ', data);
    return data;
  } catch (error: any) {
    console.error('Unexpected error in updateLeageStatus:', error.message);
    return null;
  }
}
