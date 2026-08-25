// importWeekData.js

const { createClient } = require('@supabase/supabase-js');
const { parse } = require('csv-parse');
const fs = require('fs');
const path = require('path');
const fse = require('fs-extra'); // For checking directory/file existence

// Load environment variables (if using a .env file)
require('dotenv').config();

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_ANON_KEY; // Or process.env.SUPABASE_SERVICE_ROLE_KEY for server-side
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const DATA_BASE_PATH = '/Users/travis/work/twothings/fantasy-data/NFL-Data-main/NFL-data-Players'; // Adjust this to your actual data directory root

// --- CSV Header Definitions for mapping ---
// These are the exact headers in your CSV files.
// We use a consistent casing for keys in the object, but the CSV parser will respect original casing.
const OFFENSIVE_HEADERS = [
    'playername', 'playerid', 'pos', 'team', 'playeropponent', 'passingyds', 'passingtd', 'passingint',
    'rushingyds', 'rushingtd', 'receivingrec', 'receivingyds', 'receivingtd', 'rettd', 'fumtd',
    '2pt', 'fum', 'fanptsagainst_pts', 'touchcarries', 'touchreceptions', 'touches',
    'targetsreceptions', 'targets', 'receptionpercentage', 'rztarget', 'rztouch', 'rzg2g', 'rank', 'totalpoints'
];

const KICKER_HEADERS = [
    'playername', 'playerid', 'pos', 'team', 'playeropponent', 'patmade', 'patmissed',
    'fgmade_0_19', 'fgmade_20_29', 'fgmade_30_39', 'fgmade_40_49', 'fgmade_50',
    'fgmiss_0_19', 'fgmiss_20_29', 'fgmiss_30_39', 'rank', 'totalpoints'
];

const DEFENSIVE_HEADERS = [
    'playername', 'playerid', 'pos', 'team', 'playeropponent', 'tacklestot', 'tacklesast', 'tacklessck',
    'tacklestfl', 'turnoverint', 'turnoverfrcfum', 'turnoverfumrec', 'scoreinttd', 'scorefumtd',
    'scoreblktd', 'scoresaf', 'scoredef2ptret', 'blk', 'pdef', 'qbhit', 'returnintytds', 'returnfumyds',
    'rank', 'totalpoints'
];

const FILE_TYPES = {
    offensive: ['QB.csv', 'RB.csv', 'TE.csv', 'WR.csv'], // Added WR assuming you might have them
    kicker: ['K.csv'],
    defensive: ['DB.csv', 'DL.csv', 'LB.csv']
};

/**
 * Reads and parses a CSV file.
 * @param {string} filePath - Path to the CSV file.
 * @returns {Promise<Array<Object>>} - An array of parsed CSV rows.
 */
async function readCsv(filePath) {
    const results = [];
    return new Promise((resolve, reject) => {
    fs.createReadStream(filePath)
        .pipe(parse({ columns: true })) // Use 'columns: true' for object output
        .on('data', (data) => {
            // console.log('Parsed row data:', data); // Inspect the data here
            results.push(data);
        })
        .on('end', () => {
            //console.log('CSV parsing complete. Results:', results.length);
            resolve(results);
        })
        .on('error', (error) => {
            console.error('Error during CSV parsing:', error);
            reject(error);
        });
})
.then((parsedData) => {
    console.log('Successfully parsed CSV:', parsedData.length);
    return parsedData;
})
.catch((err) => {
    console.error('Promise rejected with error:', err);
});
}

/**
 * Inserts distinct teams into the nfl_teams table.
 * @param {Array<Object>} allPlayers - Array of all player data from CSVs.
 */
async function insertDistinctTeams(allPlayers) {
    console.log('Inserting distinct teams...');
    console.log('inspecting pleyers', allPlayers.length);
    const distinctTeams = [...new Set(allPlayers.map(p => p.Team))].map(name => ({
        name: name,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
    }));

    if (distinctTeams.length === 0) {
        console.log('No new teams to insert.');
        return;
    }

    // Use upsert to handle existing teams without erroring
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
async function insertDistinctPlayers(allPlayers) {
    console.log('Inserting distinct players...');
    const distinctPlayers = {};
    allPlayers.forEach(p => {
        if (!distinctPlayers[p.PlayerId]) {
            distinctPlayers[p.PlayerId] = {
                nfl_id: String(p.PlayerId), // nfl_id is VARCHAR, ensure consistency
                name: p.PlayerName,
                position_type: p.Pos,
                team_name: p.Team, // Temporarily store team_name to join with nfl_teams later
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

    // Use upsert to handle existing players without erroring
    const { error: insertError } = await supabase
        .from('nfl_players')
        .upsert(playersToInsert, { onConflict: 'nfl_id', ignoreDuplicates: true }); // 'nfl_id' must have a UNIQUE constraint!

    if (insertError) {
        console.error('Error inserting distinct players:', insertError.message);
        throw insertError;
    }
    console.log(`Inserted/updated ${playersToInsert.length} distinct players.`);

    // Fetch the newly inserted/existing players to build the PlayerId to DB_ID map
    const { data: currentPlayers, error: fetchError } = await supabase
        .from('nfl_players')
        .select('id, nfl_id')
        .in('nfl_id', playersToInsert.map(p => p.nfl_id));

    if (fetchError) {
        console.error('Error fetching nfl_players for ID map:', fetchError.message);
        throw fetchError;
    }

    const playerIdToDbIdMap = new Map(currentPlayers.map(p => [p.nfl_id, p.id]));
    return playerIdToDbIdMap;
}

/**
 * Maps a CSV row to the match_players table schema.
 * @param {Object} row - The parsed CSV row.
 * @param {number} gameWeekId - The ID of the game week.
 * @param {Map<string, number>} nflPlayersMap - Map of PlayerId (from CSV) to nfl_player_id (from DB).
 * @param {string} playerCsvId - The PlayerId from the CSV row.
 * @returns {Object} - An object formatted for insertion into match_players.
 */
function mapCsvRowToMatchPlayer(row, gameWeekId, nflPlayersMap, playerCsvId) {
    const commonFields = {
        game_week_id: gameWeekId,
        nfl_player_id: nflPlayersMap.get(playerCsvId),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        // All values default to 0 or null if not explicitly set for a player type
        passing_yards: 0, passing_tds: 0, passing_twoptm: 0, interceptions_thrown: 0,
        rushing_yards: 0, rushing_tds: 0, rushing_twoptm: 0,
        receiving_receptions: 0, receiving_yards: 0, receiving_tds: 0, receiving_twoptm: 0,
        times_sacked: 0, fumbles_lost: 0, touch_carries: 0, touch_receptions: 0, touches: 0,
        targets_receptions: 0, targets: 0, reception_percentage: 0.00, rz_target: 0, rz_touch: 0, rz_g2g: 0,

        pat_made: 0, pat_missed: 0, fg_made_0_19: 0, fg_made_20_29: 0, fg_made_30_39: 0,
        fg_made_40_49: 0, fg_made_50_plus: 0, fg_miss_0_19: 0, fg_miss_20_29: 0, fg_miss_30_39: 0,

        tackles_total: 0, tackles_assisted: 0, sacks_made: 0.00, tackles_for_loss: 0, forced_fumbles: 0,
        fumbles_won: 0, interceptions_caught: 0, safeties: 0, defensive_two_pt_returns: 0,
        blocked_kicks: 0, passes_defended: 0, qb_hits: 0, interception_return_yards: 0,
        fumble_return_yards: 0, defense_touchdowns: 0,

        points_conceded: 0.00, points: 0.00
    };

    // Offensive (QB, RB, TE, WR)
    if (OFFENSIVE_HEADERS.every(h => row.hasOwnProperty(h))) {
        return {
            ...commonFields,
            passing_yards: parseInt(row.passingyds || 0),
            passing_tds: parseInt(row.passingtd || 0),
            passing_twoptm: parseInt(row['2pt'] || 0), // Use row['2pt'] as '2pt' is not a valid identifier
            interceptions_thrown: parseInt(row.passingint || 0),
            rushing_yards: parseInt(row.rushingyds || 0),
            rushing_tds: parseInt(row.rushingtd || 0),
            // rushing_twoptm and receiving_twoptm are assumed to be consolidated into '2pt' from NFL_RESULTS
            receiving_receptions: parseInt(row.receivingrec || 0),
            receiving_yards: parseInt(row.receivingyds || 0),
            receiving_tds: parseInt(row.receivingtd || 0),
            // ret_td and fum_td are typically defensive/ST TDs, not individual offensive player TDs
            // We'll map them to defense_touchdowns in defensive players
            fumbles_lost: parseInt(row.fum || 0),
            touch_carries: parseInt(row.touchcarries || 0),
            touch_receptions: parseInt(row.touchreceptions || 0),
            touches: parseInt(row.touches || 0),
            targets_receptions: parseInt(row.targetsreceptions || 0),
            targets: parseInt(row.targets || 0),
            reception_percentage: parseFloat(row.receptionpercentage || 0.00),
            rz_target: parseInt(row.rztarget || 0),
            rz_touch: parseInt(row.rztouch || 0),
            rz_g2g: parseInt(row.rzg2g || 0),
            points_conceded: parseFloat(row.fanptsagainst_pts || 0.00), // This is typically for defense, but included if present
            points: parseFloat(row.totalpoints || 0.00) // This is player's total fantasy points
        };
    }
    // Defensive (DB, DL, LB)
    else if (DEFENSIVE_HEADERS.every(h => row.hasOwnProperty(h))) {
        return {
            ...commonFields,
            tackles_total: parseInt(row.TacklesTot || 0),
            tackles_assisted: parseInt(row.TacklesAst || 0),
            sacks_made: parseFloat(row.TacklesSck || 0.00),
            tackles_for_loss: parseInt(row.TacklesTfl || 0),
            forced_fumbles: parseInt(row.TurnoverFrcFum || 0),
            fumbles_won: parseInt(row.TurnoverFumRec || 0),
            interceptions_caught: parseInt(row.TurnoverInt || 0),
            safeties: parseInt(row.ScoreSaf || 0),
            defensive_two_pt_returns: parseInt(row.ScoreDef2ptRet || 0),
            blocked_kicks: parseInt(row.Blk || 0),
            passes_defended: parseInt(row.PDef || 0),
            qb_hits: parseInt(row.QBHit || 0),
            interception_return_yards: parseInt(row.ReturnIntYds || 0),
            fumble_return_yards: parseInt(row.ReturnFumYds || 0),
            defense_touchdowns: (parseInt(row.ScoreIntTd || 0) + parseInt(row.ScoreFumTd || 0) + parseInt(row.ScoreBlkTd || 0)),
            points: parseFloat(row.TotalPoints || 0.00)
        };
    }
    // Kicker (K)
    else if (KICKER_HEADERS.every(h => row.hasOwnProperty(h))) {
        return {
            ...commonFields,
            pat_made: parseInt(row.PatMade || 0),
            pat_missed: parseInt(row.PatMissed || 0),
            fg_made_0_19: parseInt(row.FgMade_0_19 || 0),
            fg_made_20_29: parseInt(row.FgMade_20_29 || 0),
            fg_made_30_39: parseInt(row.FgMade_30_39 || 0),
            fg_made_40_49: parseInt(row.FgMade_40_49 || 0),
            fg_made_50_plus: parseInt(row.FgMade_50 || 0),
            fg_miss_0_19: parseInt(row.FgMiss_0_19 || 0),
            fg_miss_20_29: parseInt(row.FgMiss_20_29 || 0),
            fg_miss_30_39: parseInt(row.FgMiss_30_39 || 0),
            points: parseFloat(row.TotalPoints || 0.00)
        };
    }
    return null; // Should not happen if all files match a type
}


/**
 * Main function to import data for a specific season and week.
 * @param {string} seasonYear - The season year (e.g., '2024').
 * @param {string} gameWeek - The game week number (e.g., '1').
 */
async function importWeekData(seasonYear, gameWeek) {
    if (!SUPABASE_URL || !SUPABASE_KEY) {
        console.error('Supabase URL or Key is not set in environment variables.');
        process.exit(1);
    }

    const weekFolderPath = path.join(DATA_BASE_PATH, seasonYear, gameWeek);

    if (!await fse.pathExists(weekFolderPath)) {
        console.error(`Error: Folder for ${seasonYear}/Week ${gameWeek} not found at ${weekFolderPath}`);
        process.exit(1);
    }

    console.log(`Starting import for Season: ${seasonYear}, Week: ${gameWeek}`);

    let allPlayersData = []; // To collect all player data for team/player population
    let matchPlayersToInsert = []; // To collect all final records for match_players

    // Step 1: Read all CSVs for the week
    for (const type of Object.keys(FILE_TYPES)) {
        for (const fileName of FILE_TYPES[type]) {
            const filePath = path.join(weekFolderPath, fileName);
            if (await fse.pathExists(filePath)) {
                try {
                    console.log(`Reading ${filePath}...`);
                    const players = await readCsv(filePath);
                    console.log(`Read ${players.length} players from ${filePath}`);
                    allPlayersData = allPlayersData.concat(players);
                } catch (error) {
                    console.error(`Failed to read CSV ${filePath}:`, error.message);
                    process.exit(1);
                }
            } else {
                console.warn(`Warning: File not found: ${filePath}`);
            }
        }
    }

    if (allPlayersData.length === 0) {
        console.log('No player data found for this week. Exiting.');
        return;
    }

    // Step 2: Ensure nfl_teams are populated
    try {
        await insertDistinctTeams(allPlayersData);
    } catch (error) {
        console.error('Failed to populate nfl_teams. Aborting.', error);
        process.exit(1);
    }

    // Step 3: Ensure nfl_players are populated and get player_id map
    let nflPlayersMap;
    try {
        nflPlayersMap = await insertDistinctPlayers(allPlayersData);
    } catch (error) {
        console.error('Failed to populate nfl_players. Aborting.', error);
        process.exit(1);
    }

    // Step 4: Map all raw player data to match_players format
    console.log('Mapping player data to match_players format...');
    // Fetch the game_week_id from the 'game_weeks' table or create it if it doesn't exist
    let gameWeekId;
    try {
        const { data: gameWeekData, error: gwError } = await supabase
            .from('game_weeks')
            .select('id')
            .eq('number', parseInt(gameWeek))
            .eq('season_year', parseInt(seasonYear)) // Add this line for the season_year filter
            .single();

        if (gwError && gwError.code === 'PGRST116') { // No rows found
            console.log(`Game week ${gameWeek} not found. Creating new game_week entry.`);
            const { data: newGw, error: newGwError } = await supabase
                .from('game_weeks')
                .insert({ number: parseInt(gameWeek), created_at: new Date().toISOString(), updated_at: new Date().toISOString(), season_year: parseInt(seasonYear) })
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

    console.log(`Processing player:`, allPlayersData[0]);
    allPlayersData.forEach(row => {
        // console.log(`Processing player: ${row}`);
        const mappedPlayer = mapCsvRowToMatchPlayer(row, gameWeekId, nflPlayersMap, String(row.PlayerId));
        if (mappedPlayer) {
            matchPlayersToInsert.push(mappedPlayer);
        }
    });

    if (matchPlayersToInsert.length === 0) {
        console.log('No valid player data to insert into match_players.');
        return;
    }

    // Step 5: Insert into match_players with UPSERT (to handle unique_player_gameweek constraint)
    console.log(`Inserting ${matchPlayersToInsert.length} records into match_players...`);
    // Supabase upsert requires a unique constraint to avoid duplicates.
    // We previously added 'unique_player_gameweek' on (game_week_id, nfl_player_id)
    const { error: insertMpError } = await supabase
        .from('match_players')
        .upsert(matchPlayersToInsert, { onConflict: 'game_week_id,nfl_player_id' }); // Specify the unique constraint columns

    if (insertMpError) {
        console.error('Error inserting into match_players:', insertMpError.message);
    } else {
        console.log(`Successfully imported data for Season ${seasonYear}, Week ${gameWeek}.`);
    }
}

// --- Command line arguments ---
const args = process.argv.slice(2);
if (args.length !== 2) {
    console.log('Usage: node importWeekData.js <seasonYear> <gameWeek>');
    console.log('Example: node importWeekData.js 2024 1');
    process.exit(1);
}

const seasonYear = args[0];
const gameWeek = args[1];

importWeekData(seasonYear, gameWeek);