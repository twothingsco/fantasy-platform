import teamPlayers from '../fullTeams_OLD.json' with { type: "json" }; 
import nfl_teams_rows from '../nfl_teams_rows.json' with { type: "json" }; 
import { supabase } from './supabaseClient.ts';

const SCHEMA = 'public'

interface Player {
  id: number;
  name: string;
  firstName: string;
  lastName: string;
  ShirtNumber: string;
  ContractType?: string;
  Position?: string; // The property we need to extract
  ContractId?: string;
  teamId: number;
  teamName: string;
  teamAbbreviation: string;
}

interface Team{
    teamId: number;
    teamName: string;
    teamAbbreviation: string;
}

/**
 * Extracts a unique list of Team objects from an array of Player objects.
 * Uses teamId as the unique key to ensure uniqueness.
 * @param players An array of Player objects.
 * @returns An array of unique Team objects.
 */
function getUniqueTeams(players: Player[]): Team[] {
  // Use a Map where the key is the unique teamId (number)
  // and the value is the full Team object.
  const uniqueTeamsMap = new Map<number, Team>();

  for (const player of players) {
    const team: Team = {
      teamId: player.teamId,
      teamName: player.teamName,
      teamAbbreviation: player.teamAbbreviation,
    };

    // The .set() method only stores a value once per unique key (teamId).
    // If we encounter the same teamId again, it just overwrites the previous entry 
    // with an identical object, effectively ensuring uniqueness.
    uniqueTeamsMap.set(player.teamId, team);
  }

  // Convert the Map's values (the Team objects) into an array and return it.
  return Array.from(uniqueTeamsMap.values());
}

/**
 * Extracts a unique set of player positions from an array of Player objects.
 * @param players An array of Player objects.
 * @returns An array of unique position strings.
 */
function getUniquePositions(players: Player[]): string[]{
  // 1. Use map() to transform the array of objects into an array of 'Position' strings
  const allPositions = players.map(player => player.Position);

  // 2. Use the Set object to automatically filter out duplicate values
  const uniquePositionsSet = new Set(allPositions);

  // 3. Convert the Set back into an Array, filter out undefined, and return it
  return Array.from(uniquePositionsSet).filter((pos): pos is string => typeof pos === 'string');
}

// Define the output interface for type safety
interface PositionType {
  position_type: string;
}

// Define the comprehensive mapping for all known positions
const positionMap: Record<string, string> = {
  // LB
  "linebacker": "LB",
  
  // RB
  "running back": "RB",
  "fullback": "RB",
  "slot back": "RB",

  // DL
  "defensive end": "DL",
  "defensive line": "DL",
  "defensive tackle": "DL",
  "nose tackle": "DL",

  // QB
  "quarterback": "QB",

  // K (Special Teams)
  "kicker": "K",
  "punter": "K",
  "long snapper": "K",

  // WR
  "wide receiver": "WR",

  // DB
  "defensive back": "DB",
  "cornerback": "DB",
  "free safety": "DB",
  "strong safety": "DB",

  // TE
  "tight end": "TE",

  // OL - Offensive Line group
  "offensive line": "OL",
  "offensive tackle": "OL",
  "offensive guard": "OL",
  "center": "OL",
};

const filterPositions = {
  "K": 1,
  "QB": 1,
  "RB": 2,
  "TE": 1,
  "WR": 2,
  "DEF": 1,
  "FLEX": 1
};

/**
 * Maps a long position string to its two-letter short code object.
 * @param rawPosition The player's position string (e.g., "running back").
 * @returns A PositionType object (e.g., { position_type: "RB" }).
 */
export function mapPositionToCode(rawPosition: string | undefined): PositionType {
  // Handle undefined or null input immediately
  if (!rawPosition) {
    return { position_type: "OTHER" };
  }

  // Normalize the input (e.g., to lowercase) to ensure a match
  const normalizedPosition = rawPosition.toLowerCase().trim();

  // 1. Look up the short code in the map
  let code = positionMap[normalizedPosition];

  // 3. Fallback: If position is found in map but the code is empty, or
  // if the initial lookup failed, use a generic code (e.g., "OTHER" or "DEF")
  if (!code) {
    // NOTE: Based on your target list, it's safer to use 'OTHER' 
    // for undefined/unmapped positions, not 'DEF', unless you specify otherwise.
    return { position_type: "OTHER" };
  }

  // 4. Return the result
  return { position_type: code };
}

function mergeTeamLists(teams: TeamData[], dbEntries: DbEntry[]): MergedTeam[] {
  // 1. Create a lookup map from List 2 using the abbreviation as the key.
  // This allows for quick O(1) lookups.
  const dbIdMap = new Map<string, number>();
  for (const entry of dbEntries) {
    // We only care about entries that are actual teams (i.e., not 'FA')
    if (entry.name && entry.name !== "FA") {
      dbIdMap.set(entry.name, entry.id);
    }
  }

  // 2. Iterate over List 1 and merge with the corresponding dbId.
  const mergedList: MergedTeam[] = [];

  for (const team of teams) {
    const abbreviation = team.teamAbbreviation;
    const dbId = dbIdMap.get(abbreviation);

    // Only merge if a matching dbId is found
    if (dbId !== undefined) {
      mergedList.push({
        //id: dbId, // ID from List 2
        nfl_id: team.teamId,
        name: team.teamName,
        abbreviation: team.teamAbbreviation,
      });
    } else {
      console.warn(`Warning: Could not find DB ID for team abbreviation: ${abbreviation}`);
      // You may choose to include a default value or skip the entry here
    }
  }

  return mergedList;
}

async function saveTeams(teams){
    console.log("Distinct teams to insert:", teams);
    if (teams.length === 0) {
        console.log('No new teams to insert.');
        return;
    }

    const { error } = await supabase
        .schema(SCHEMA)
        .from('nfl_teams')
        .upsert(teams, { onConflict: 'name', ignoreDuplicates: true }); // 'name' must have a UNIQUE constraint!

    if (error) {
        console.error('Error inserting distinct teams:', error.message);
        throw error;
    }
}

/**
 * Inserts distinct players into the nfl_players table and returns a map of PlayerId to nfl_player_id.
 * @param {Array<Object>} allPlayers - Array of all player data from CSVs.
 * @returns {Promise<Map<string, number>>} - Map of player_id (from CSV) to nfl_player_id (from DB).
 */
async function savePlayers(allPlayers) {
    console.log('Inserting distinct players...');
    
    const playerRecords = Object.values(allPlayers);
    if (playerRecords.length === 0) {
        console.log('No new players to insert.');
        return new Map();
    }

    // Fetch nfl_team_ids
    const teamNames = [...new Set(playerRecords.map(p => p.teamAbbreviation))];
    const { data: teamsData, error: teamsError } = await supabase
        .schema(SCHEMA)
        .from('nfl_teams')
        .select('id, abbreviation')
        .in('abbreviation', teamNames);

    if (teamsError) {
        console.error('Error fetching nfl_teams:', teamsError.message);
        throw teamsError;
    }

    const teamNameToIdMap = new Map(teamsData.map(team => [team.abbreviation, team.id]));

    const playersToInsert = playerRecords.map(p => ({
        nfl_id: p.id,
        name: p.name,
        firstname: p.firstName,
        lastname: p.lastName,
        position_type: p.position,
        nfl_team_id: teamNameToIdMap.get(p.teamAbbreviation), // Get ID from map
    }));

    const { error: insertError } = await supabase
        .schema(SCHEMA)
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
                .schema(SCHEMA)
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

function chunkArray<T>(array: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
}
async function batchUpdatePlayers(updateChunks: any) {
  const table = 'nfl_players';
  const conflictColumn = 'nfl_id'; // The unique column in your Supabase table

  for (const [index, chunk] of updateChunks.entries()) {
    console.log(`Processing chunk ${index + 1}/${updateChunks.length} (Size: ${chunk.length})...`);
    
    // Use upsert to perform a batch update
    const { data, error } = await supabase
      .from(table)
      .upsert(chunk, {
        // This is key: tell Supabase to look for a conflict on the 'nfl_id'
        // and if a match is found, UPDATE the existing row.
        onConflict: conflictColumn, 
        // Only update the 'ShirtNumber' column, ignoring other potential fields
        // that might be missing in your payload.
        ignoreDuplicates: false, 
        // Optionally return the updated records
        // select: '*' 
      });

    if (error) {
      console.error(`Error in chunk ${index + 1}:`, error);
      // Decide how to handle the error (e.g., stop, log and continue, etc.)
      return; 
    }
    
    // Optional: Log success or rate limit for very large updates
    // await new Promise(resolve => setTimeout(resolve, 100)); 
  }

  console.log('Batch update complete!');
}

async function updateShirtNumbers (){
  const updateData: UpdatePayload[] = teamPlayers.map(player => ({
    nfl_id: player.id, // Match the database column name for the ID
    shirt_number: player.ShirtNumber
  }));
  const CHUNK_SIZE = 500; // You can adjust this value
  const updateChunks = chunkArray(updateData, CHUNK_SIZE);
  console.log(`Starting batch update for ${updateData.length} players...`);
  await batchUpdatePlayers(updateChunks);

}

const uniquePositions = getUniquePositions(teamPlayers);
console.log(uniquePositions);

//test position Mapping 
const mappedPositions = teamPlayers.map(player => {
  const position = mapPositionToCode(player.Position);
  return {
    ...player,
    position: position.position_type
  };
});


// const uniqueTeams = getUniqueTeams(teamPlayers);

// console.log(uniqueTeams);

// const finalMergedTeams = mergeTeamLists(uniqueTeams, nfl_teams_rows);
// console.log('Total Teams - ' , uniqueTeams.length);
// await saveTeams(finalMergedTeams);

// // console.log(JSON.stringify(finalMergedTeams, null, 2));
// // 

// console.log('Total Players - ' , mappedPositions.length);

// const filterPlayers = mappedPositions.filter(p => p.position in filterPositions);
// console.log('Total Filtered Players - ' , filterPlayers.length);
// console.log(filterPlayers[0]);

// await savePlayers(filterPlayers);
await updateShirtNumbers();