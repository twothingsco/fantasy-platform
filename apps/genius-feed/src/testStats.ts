
import {getStats, saveMatchPlayer } from './stats.ts';
import gameJson from '../statsexample.json' with { type: "json" };
import weekMap from '../weekMap.json' with { type: "json" };
import { supabase } from './supabaseClient.ts';

import {getAPIData} from './auth.ts';

const SCHEMA = 'public'; // Change this to your desired schema name

export async function getGames(roundId: number) {
   

    const url = `https://fixtures.api.geniussports.com/v2/fixtures?filter=roundId[equals]:${roundId}&page=1&pageSize=100`;
    const {data, error} = await getAPIData(url);
    if (error) {
        console.error(error);
        return;
    }
    // Process the data as needed

    //console.log('Games data: ', data);
    const games = data.items;
    // console.log('Found games: first gmae looks like  ', games[0]);
    const gameDetails = await Promise.all(games.map((game:any) => {
        const homeTeamId = game.homeCompetitor.id;
        const awayTeam = game.competitors.find((c:any) => c.id !== homeTeamId);
        const awayTeamId = awayTeam ? awayTeam.id : null;
        return {
            id:game.id,
            name:game.name,
            homeTeamId:homeTeamId,
            awayTeamId:awayTeamId,
            venue:game.venue.name,
            startDate:game.startDate,
            modifiedOn:game.modifiedOn
        }
        
    }));
    return gameDetails;
}

async function writeFile(data, filePath){
    try {
  // Convert the JavaScript object to a formatted JSON string
  const jsonString = JSON.stringify(data, null, 2);

  // Write the JSON string to the file
  await Deno.writeTextFile(filePath, jsonString);

    console.log(`Successfully wrote data to ${filePath}`);
    } catch (error) {
    console.error(`Error writing file: ${error}`);
    }
}

async function getGameWeekId(seasonYear:number, gameWeek:string): Promise<number | undefined> {
    const currentWeekId = 4; // Example game_week_id
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
            return gameWeekId;
        }
    } catch (error) {
        console.error('Failed to get/create game_week ID. Aborting.', error);
        process.exit(1);
    }
}

async function getPlayerIDMap(): Promise<Map<number, number>> {
    const playerIdMap = new Map<number, number>();

    try {
        const { data: playerData, error: playerError } = await supabase
            .schema(SCHEMA)
            .from('nfl_players')
            .select('id, nfl_id');

        if (playerError) {
            console.error('Error fetching player data:', playerError.message);
            throw playerError;
        }

        playerData.forEach((player: any) => {
            playerIdMap.set(parseInt(player.nfl_id), player.id);
        });
    } catch (error) {
        console.error('Failed to get player ID map. Aborting.', error);
        process.exit(1);
    }

    return playerIdMap;
}   

const seasonYear = Deno.args[0];
const gameWeek = Deno.args[1];

//console.log("WEEK MAP ", weekMap);
const currentRoundId = weekMap[gameWeek]; // Example game_week_id
const currentWeekId = await getGameWeekId(parseInt(seasonYear), gameWeek);
console.log("Current Round ID:", currentRoundId);
const games = await getGames(currentRoundId);
console.log("Games in current round:", games);

const playerIdMap = await getPlayerIDMap();
console.log("Player ID Map ", playerIdMap);
const testDBID = playerIdMap.get(998871);
console.log("Test DB ID for NFL Player 998871 (Patrick Mahomes): ", testDBID);

if (games && currentWeekId){
    for (const game of games) {
        const stats = await getStats(currentWeekId, game.id, playerIdMap);
        if (stats) {
            console.log(`Processing stats for game ID: ${game.id} stats length: ${stats.length}`);
            await saveMatchPlayer(stats);
        }
    }
    
    
    // console.log("Game Stats:", stats);
}

