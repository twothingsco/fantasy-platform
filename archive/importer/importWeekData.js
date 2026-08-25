// importWeekData.js

import { createClient } from '@supabase/supabase-js';
import  { parse } from 'csv-parse';
import * as fs from 'fs';
import * as fse from 'fs-extra'; 
import * as path from 'path';
import * as dotenv from 'dotenv';

// Load environment variables (if using a .env file)
dotenv.config();
const SCHEMA = 'fantasy'; // Define your schema here
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_ANON_KEY; // Or process.env.SUPABASE_SERVICE_ROLE_KEY for server-side
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  // Optional: You might want to specify schema or other options
  auth: {
    persistSession: false, // Prevents storing session in memory/localStorage, important for serverless
  }
});
//const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const DATA_BASE_PATH = '/Users/travis/work/twothings/NFL-Data/NFL-data-Players'; // Adjust this to your actual data directory root

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
                const lowerCaseData = {};
                for (const key in data) {
                    if (Object.hasOwnProperty.call(data, key)) {
                        lowerCaseData[key.toLowerCase()] = data[key];
                    }
                }
                results.push(lowerCaseData);
            })
            .on('end', () => {
                console.log(`CSV parsing complete for ${filePath}. Rows: ${results.length}`);
                resolve(results);
            })
            .on('error', (error) => {
                console.error('Error during CSV parsing:', error);
                reject(error);
            });
    })
        .then((parsedData) => {
            return parsedData;
        })
        .catch((err) => {
            console.error('Promise rejected with error:', err);
            throw err; // Re-throw to propagate the error
        });
}

/**
 * Inserts distinct teams into the nfl_teams table.
 * @param {Array<Object>} allPlayers - Array of all player data from CSVs.
 */
async function insertDistinctTeams(allPlayers) {
    console.log('Inserting distinct teams...');
    const teamList = allPlayers.map(p => p.team);
    console.log(`teamList: `, teamList);
    const distinctTeams = [...new Set(allPlayers.map(p => p.team))].map(name => ({
        name: name,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
    }));
    //debug 
    console.log("Distinct teams to insert:", distinctTeams);
    if (distinctTeams.length === 0) {
        console.log('No new teams to insert.');
        return;
    }

    const { error } = await supabase
        .schema(SCHEMA)
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
        if (p.playerid && !distinctPlayers[p.playerid]) { // Ensure PlayerId exists
            distinctPlayers[p.playerid] = {
                nfl_id: String(p.playerid), // nfl_id is VARCHAR, ensure consistency
                name: p.playername,
                position_type: p.pos,
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
        .schema(SCHEMA)
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

/**
 * Maps a CSV row to the match_players table schema.
 * @param {Object} row - The parsed CSV row.
 * @param {number} gameWeekId - The ID of the game week.
 * @param {Map<string, number>} nflPlayersMap - Map of PlayerId (from CSV) to nfl_player_id (from DB).
 * @param {string} playerCsvId - The PlayerId from the CSV row.
 * @returns {Object} - An object formatted for insertion into match_players.
 */
function mapCsvRowToMatchPlayer(type, row, gameWeekId, nflPlayersMap, playerCsvId) {
    //console.log(`Mapping CSV row for player ID: ${playerCsvId} Game Week ID: ${gameWeekId} row:`, row);
    // Check if playerCsvId exists in the map before proceeding
    if (!nflPlayersMap.has(playerCsvId)) {
        console.warn(`Player ID ${playerCsvId} not found in nflPlayersMap. Skipping row.`);
        return null;
    }

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
    if (type === 'offensive') {//(OFFENSIVE_HEADERS.every(h => row.hasOwnProperty(h.toLowerCase()) || row.hasOwnProperty(h))) { // Check both cases
        return {
            ...commonFields,
            passing_yards: parseInt(row.passingyds || 0),
            passing_tds: parseInt(row.passingtd || 0),
            passing_twoptm: parseInt(row['2pt'] || 0),
            interceptions_thrown: parseInt(row.passingint || 0),
            rushing_yards: parseInt(row.rushingyds || 0),
            rushing_tds: parseInt(row.rushingtd || 0),
            receiving_receptions: parseInt(row.receivingrec || 0),
            receiving_yards: parseInt(row.receivingyds || 0),
            receiving_tds: parseInt(row.receivingtd || 0),
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
            points_conceded: parseFloat(row.fanptsagainst_pts || 0.00),
            points: parseFloat(row.totalpoints || 0.00)
        };
    }
    // Defensive (DB, DL, LB)
    else if (type === 'defensive'){//(DEFENSIVE_HEADERS.every(h => row.hasOwnProperty(h.toLowerCase()) || row.hasOwnProperty(h))) {
        //  console.log("WE have DEFESIVE HEADER MATCH");
        return {
            ...commonFields,
            tackles_total: parseInt(row.TacklesTot || row.tacklestot || 0),
            tackles_assisted: parseInt(row.TacklesAst || row.tacklesast || 0),
            sacks_made: parseFloat(row.TacklesSck || row.tacklessck || 0.00),
            tackles_for_loss: parseInt(row.TacklesTfl || row.tacklestfl || 0),
            forced_fumbles: parseInt(row.TurnoverFrcFum || row.turnoverfrcfum || 0),
            fumbles_won: parseInt(row.TurnoverFumRec || row.turnoverfumrec || 0),
            interceptions_caught: parseInt(row.TurnoverInt || row.turnoverint || 0),
            safeties: parseInt(row.ScoreSaf || row.scoresaf || 0),
            defensive_two_pt_returns: parseInt(row.ScoreDef2ptRet || row.scoredef2ptret || 0),
            blocked_kicks: parseInt(row.Blk || row.blk || 0),
            passes_defended: parseInt(row.PDef || row.pdef || 0),
            qb_hits: parseInt(row.QBHit || row.qbhit || 0),
            interception_return_yards: parseInt(row.ReturnIntYds || row.returnintytds || 0),
            fumble_return_yards: parseInt(row.ReturnFumYds || row.returnfumyds || 0),
            defense_touchdowns: (parseInt(row.ScoreIntTd || row.scoreinttd || 0) + parseInt(row.ScoreFumTd || row.scorefumtd || 0) + parseInt(row.ScoreBlkTd || row.scoreblktd || 0)),
            points: parseFloat(row.TotalPoints || row.totalpoints || 0.00)
        };
    }
    // Kicker (K)
    else if (type =='kicker'){//(KICKER_HEADERS.every(h => row.hasOwnProperty(h.toLowerCase()) || row.hasOwnProperty(h))) {
        return {
            ...commonFields,
            pat_made: parseInt(row.PatMade || row.patmade || 0),
            pat_missed: parseInt(row.PatMissed || row.patmissed || 0),
            fg_made_0_19: parseInt(row.FgMade_0_19 || row.fgmade_0_19 || 0),
            fg_made_20_29: parseInt(row.FgMade_20_29 || row.fgmade_20_29 || 0),
            fg_made_30_39: parseInt(row.FgMade_30_39 || row.fgmade_30_39 || 0),
            fg_made_40_49: parseInt(row.FgMade_40_49 || row.fgmade_40_49 || 0),
            fg_made_50_plus: parseInt(row.FgMade_50 || row.fgmade_50 || 0),
            fg_miss_0_19: parseInt(row.FgMiss_0_19 || row.fgmiss_0_19 || 0),
            fg_miss_20_29: parseInt(row.FgMiss_20_29 || row.fgmiss_20_29 || 0),
            fg_miss_30_39: parseInt(row.FgMiss_30_39 || row.fgmiss_30_39 || 0),
            points: parseFloat(row.TotalPoints || row.totalpoints || 0.00)
        };
    }
    // console.log("ERROR WE DIDNT MATCH ANY HEADERS");
    return null; // Should not happen if all files match a type
}


/**
 * Main function to import data for a specific season and week.
 * @param {string} seasonYear - The season year (e.g., '2024').
 * @param {string} gameWeek - The game week number (e.g., '1').
 */
async function  importWeekData(seasonYear, gameWeek) {
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

    let allPlayersDataForTeamsAndPlayers = []; // To collect all player data for initial team/player population

    // Step 1: Read ALL CSVs first to gather all unique teams and players
    // This is crucial because a player might appear in multiple files (e.g., QB and offensive stats)
    // and we need to insert all distinct teams and players BEFORE inserting into match_players.
    for (const type of Object.keys(FILE_TYPES)) {
        for (const fileName of FILE_TYPES[type]) {
            const filePath = path.join(weekFolderPath, fileName);
            if (await fse.pathExists(filePath)) {
                try {
                    console.log(`Pre-reading ${filePath} for distinct teams/players...`);
                    const players = await readCsv(filePath);
                    allPlayersDataForTeamsAndPlayers = allPlayersDataForTeamsAndPlayers.concat(players);
                } catch (error) {
                    console.error(`Failed to pre-read CSV ${filePath}:`, error.message);
                    process.exit(1);
                }
            } else {
                console.warn(`Warning: File not found during pre-read: ${filePath}`);
            }
        }
    }

    if (allPlayersDataForTeamsAndPlayers.length === 0) {
        console.log('No player data found for this week in any file. Exiting.');
        return;
    }
    
    // Step 2: Ensure nfl_teams are populated
    try {
        await insertDistinctTeams(allPlayersDataForTeamsAndPlayers);
    } catch (error) {
        console.error('Failed to populate nfl_teams. Aborting.', error);
        process.exit(1);
    }

    // Step 3: Ensure nfl_players are populated and get player_id map
    let nflPlayersMap;
    try {
        nflPlayersMap = await insertDistinctPlayers(allPlayersDataForTeamsAndPlayers);
        console.log("STEP 3 nflPlayerMap size ", nflPlayersMap.size)
    } catch (error) {
        console.error('Failed to populate nfl_players. Aborting.', error);
        process.exit(1);
    }

    // Step 4: Fetch/Create game_week_id once
    let gameWeekId;
    try {
        const { data: gameWeekData, error: gwError } = await supabase
            .schema(SCHEMA)
            .from('game_weeks')
            .select('id')
            .eq('number', parseInt(gameWeek))
            .eq('season_year', parseInt(seasonYear))
            .single();

        if (gwError && gwError.code === 'PGRST116') { // No rows found
            console.log(`Game week ${gameWeek} for season ${seasonYear} not found. Creating new game_week entry.`);
            const { data: newGw, error: newGwError } = await supabase
                .schema(SCHEMA)
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

    // Step 5: Process each CSV file individually and insert into match_players
    for (const type of Object.keys(FILE_TYPES)) {
        for (const fileName of FILE_TYPES[type]) {
            const filePath = path.join(weekFolderPath, fileName);
            if (await fse.pathExists(filePath)) {
                try {
                    console.log(`PLAYER TYPE ${type} - Processing and inserting data from ${filePath}...`);
                    const playersInFile = await readCsv(filePath);
                    const matchPlayersToInsertFromFile = [];

                    playersInFile.forEach(row => {
                        const playerCsvId = String(row.playerid);
                        const mappedPlayer = mapCsvRowToMatchPlayer(type, row, gameWeekId, nflPlayersMap, playerCsvId);
                        if (mappedPlayer) {
                            // console.log(`Mapped player for CSV ID ${playerCsvId}:`, mappedPlayer);
                            matchPlayersToInsertFromFile.push(mappedPlayer);
                        }
                    });

                    if (matchPlayersToInsertFromFile.length > 0) {
                        console.log(`Attempting to insert/update ${matchPlayersToInsertFromFile.length} records from ${fileName} into match_players.`);
                        const { error: insertMpError } = await supabase
                            .schema(SCHEMA)
                            .from('match_players')
                            .upsert(matchPlayersToInsertFromFile, { onConflict: 'game_week_id,nfl_player_id' });

                        if (insertMpError) {
                            console.error(`Error inserting/updating records from ${fileName} into match_players:`, insertMpError.message);
                            // Optionally, you could choose to exit here or log and continue to the next file
                        } else {
                            console.log(`Successfully inserted/updated ${matchPlayersToInsertFromFile.length} records from ${fileName}.`);
                        }
                    } else {
                        console.log(`No valid player data to insert from ${fileName}.`);
                    }

                } catch (error) {
                    console.error(`Failed to process and insert data for ${filePath}:`, error.message);
                    // Continue to the next file even if one fails
                }
            } else {
                console.warn(`Warning: File not found (during second pass for insertion): ${filePath}`);
            }
        }
    }

    console.log(`All file processing complete for Season ${seasonYear}, Week ${gameWeek}.`);
}

// --- Command line arguments ---
const args = process.argv.slice(2);
if (args.length !== 2) {
    console.log('Usage: node importWeekData.js <seasonYear> <gameWeek>');
    console.log('Example: node importWeekData.js 2024 1');
    process.exit(1);
}


//usage example: node importWeekData.js -env-file=.env 2024 1
const seasonYear = args[0];
const gameWeek = args[1];

importWeekData(seasonYear, gameWeek);