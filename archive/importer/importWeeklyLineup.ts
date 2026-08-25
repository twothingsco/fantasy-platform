

import { readCsv } from './csvParser.js'; // Keep the .js extension for ES Module resolution
import { mapNFLIdtoPlayerId, insertGameWeekPlayers, getGameWeekTeam, getGameWeekId } from './nflDataServices.js'; 
import {NflPlayerFromDb ,GameWeekTeamPlayerInsert} from './types.js' // Keep the .js extension for ES Module resolution

//Team_Name,Roster_Slot,Player_Name,NFL_Player_ID,NFL_Team_ID,NFL_Position
export interface CsvRow {
    Roster_Slot: string;
    Team_Name: string;
    Player_Name: string;
    NFL_Player_ID: string; // This is the nfl_id from nfl_players table
    NFL_Team_ID: string;
    NFL_Position: string;
}
// --- CSV File Path ---
// process.argv[0] is 'node', process.argv[1] is the script path
const csvFilePath: string | undefined = process.argv[2];

if (!csvFilePath) {
    console.error('Usage: ts-node importDraft.ts <path_to_draft_results.csv>');
    process.exit(1);
}

// --- Main Script Logic ---
async function importWeeklyLineup(gameWeek: string, seasonYear:string): Promise<void> { // Specify return type as Promise<void>
    console.log(`Starting import from CSV: ${csvFilePath}`);

    // Map Team names to user_id
    const teamToUserId: { [key: string]: number } = {
        'Team A': 1,
        'Team B': 2,
        'Team C': 3,
        'Team D': 4,
        'Team E': 5,
        // Add more teams/user_ids if your league expands beyond 5 teams in the draft results
    };

    let lineupData: CsvRow[];
    try {
        // Read and parse the CSV. readCsv returns Array<Record<string, any>>,
        // which is assignable to CsvRow[] because CsvRow is a more specific Record.
        // Use a type assertion here for clarity if you are confident in the CSV structure.
        lineupData = await readCsv(csvFilePath as string) as CsvRow[];
        console.log('CSV file successfully processed. Preparing data for insert...');
    } catch (error) {
        console.error('Failed to read or parse CSV:', error instanceof Error ? error.message : String(error));
        return; // Exit the function if CSV reading/parsing fails
    }


    // Step 1: Map NFL Player IDs to their primary keys in the nfl_players table
    console.log('Mapping NFL Player IDs to their primary keys in nfl_players table...');
    const nflIdsToFetch: string[] = lineupData.map(row => row.NFL_Player_ID);
    //console.log(`Found ${nflIdsToFetch.length} unique NFL Player IDs to fetch from nfl_players table.`, nflIdsToFetch);
    const nflIdToPlayerIdMap = await mapNFLIdtoPlayerId(nflIdsToFetch);

    const inserts: GameWeekTeamPlayerInsert[] = [];
    const missingPlayers: { name: string; nflId: string; team: string; }[] = [];

    for (const row of lineupData) {
        // Ensure values from CSV are correctly parsed if they are expected to be numbers
        // For example: if Overall_Pick or Round were to be stored as numbers, you'd do:
        // const overallPick = parseInt(row.Overall_Pick, 10);
        //Team_Name,Roster_Slot,Player_Name,NFL_Player_ID,NFL_Team_ID,NFL_Position
        const userId = teamToUserId[row.Team_Name];
        const rosterSlot = row.Roster_Slot;
        const nflPlayerName = row.Player_Name; // This is the name of the player from the CSV
        const nflPlayerIdFromCsv = row.NFL_Player_ID; // This is the nfl_id in the nfl_players table

        const nflPlayersPkId = nflIdToPlayerIdMap.get(nflPlayerIdFromCsv);

        if (userId === undefined) {
            console.warn(`Warning: User ID not found for team "${row.Team_Name}". Skipping row for player: ${nflPlayerName}`);
            continue;
        }

        if (nflPlayersPkId === undefined) {
            missingPlayers.push({
                name: nflPlayerName,
                nflId: nflPlayerIdFromCsv,
                team: row.Team_Name
            });
            console.warn(`Warning: NFL Player ID "${nflPlayerIdFromCsv}" (Player: ${nflPlayerName}) not found in 'nfl_players' table. This player will not be inserted into 'user_roster'.`);
            continue;
        }
        //We need to find the right game Week ID 
        const gameWeekId = await getGameWeekId(gameWeek, seasonYear);
        console.log(`Game Week ID for week ${gameWeek} in season ${seasonYear} is ${gameWeekId}`);
        //We need to find the right GameWeekId ID for the user
        const gameWeekTeamID = await getGameWeekTeam(gameWeekId, userId) ||999; // Default to 999 if not found, handle this case appropriately
        
        inserts.push({
            game_week_team_id: gameWeekTeamID,
            nfl_player_id: nflPlayersPkId, // Use the 'id' from nfl_players
            roster_slot: rosterSlot,
            playing: true // Assuming all players in the CSV are playing, adjust as necessary
        });
    }

    if (missingPlayers.length > 0) {
        console.warn(`\n--- Summary of Missing Players from nfl_players table (${missingPlayers.length}) ---`);
        missingPlayers.forEach(p => console.warn(`Player: ${p.name}, NFL_ID: ${p.nflId}, Team: ${p.team}`));
        console.warn('-----------------------------------------------------\n');
    }

    if (inserts.length === 0) {
        console.log('No valid player data to insert into user_roster.');
        return;
    }

    // Step 3: Insert data into user_roster table
    await insertGameWeekPlayers(inserts);

    console.log('Import process completed.');
}

const week: string = process.argv[4];
const seasonYear: string = process.argv[3];

importWeeklyLineup(week, seasonYear);