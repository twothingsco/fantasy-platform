import { createClient } from '@supabase/supabase-js';
const FANTASY_SCHEMA = 'fantasy'; // Define your schema here
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_ANON_KEY; // Or process.env.SUPABASE_SERVICE_ROLE_KEY for server-side
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  // Optional: You might want to specify schema or other options
  auth: {
    persistSession: false, // Prevents storing session in memory/localStorage, important for serverless
  },
  
});

/**
 * Retrieves all users.
 * @returns An array of user objects, or null if an error occurred.
 */
async function getAllUsers() {
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
  } catch (error) {
    console.error('Unexpected error in getAllUsers:', error.message);
    return null;
  }
}

async function getTeamRoster(seasonYear, userId) {
    try {
      let { data, error } = await supabase
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
          //.order('nfl_players.name', { ascending: true });

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error fetching roster:', error);
      throw error;
    }
  }

/**
 * Retrieves all users.
 * @returns An array of user objects, or null if an error occurred.
 */
async function getTest() {
  try {
    const { data, error } = await supabase
      .schema("public")
      .from('test')
      .select('*');

    if (error) {
      console.error('Error fetching all users:', error.message);
      return null;
    }
    return data;
  } catch (error) {
    console.error('Unexpected error in getAllUsers:', error.message);
    return null;
  }
}

// const test = await getTest();
// if (test) {
//   console.log('Test:', test);
// }
// else {
//   console.log('No test data found or an error occurred.');
// }

// const users = await getAllUsers();
// if (users) {
//   console.log('Users:', users);
// }
// else {
//   console.log('No users found or an error occurred.');
// };

const roster = await getTeamRoster(2024, 1);
if (roster) {
  console.log('Roster:', roster);
}
else {
  console.log('No roster found or an error occurred.');
}
