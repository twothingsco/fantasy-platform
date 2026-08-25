import { supabase } from './supabaseClient.ts';
import {getAPIData} from './auth.ts';

const SCHEMA = 'public'; // Change this to your desired schema name

export async function getGames(gameWeekId: number, roundId: number) {
   
    const teamMap = await getNflTeamIdMap();
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
            game_week_id: gameWeekId,
            nfl_id:game.id,
            name:game.name,
            home_team_id:teamMap[homeTeamId],
            away_team_id:teamMap[awayTeamId],
            venue:game.venue?.name,
            start_date:game.startDate,
            modified_on:game.modifiedOn
        }
        
    }));
    return gameDetails;
}

export async function getNflTeamIdMap(): Promise<{ [key: number]: number }> {
  const teamNameToIdMap: { [key: number]: number } = {};
  const { data: teamsData, error: teamsError } = await supabase
    .schema(SCHEMA)
    .from('nfl_teams')
    .select('id, nfl_id');

  if (teamsError) {
    console.error('Error fetching nfl_teams:', teamsError.message);
    throw teamsError;
  }

  teamsData.forEach(team => {
    if (team.nfl_id !== null) {
      teamNameToIdMap[team.nfl_id] = team.id;
    }
  });
  console.log('NFL Team ID Map:', teamNameToIdMap);

  return teamNameToIdMap;
}
async function getGameWeek(seasonYear:number, gameWeek:string): Promise<{id:number, nfl_id:number}> {
    const currentWeekId = 4; // Example game_week_id
    let gameWeekId;
    try {
        const { data: gameWeekData, error: gwError } = await supabase
            .schema(SCHEMA)
            .from('game_weeks')
            .select('id, nfl_id')
            .eq('number', parseInt(gameWeek))
            .eq('season_year', parseInt(seasonYear))
            .single();

        if (gwError && gwError.code === 'PGRST116') { // No rows found
            console.log(`Game week ${gameWeek} for season ${seasonYear} not found. Creating new game_week entry.`);
            const { data: newGw, error: newGwError } = await supabase
                .schema(SCHEMA)
                .from('game_weeks')
                .insert({ number: parseInt(gameWeek), created_at: new Date().toISOString(), updated_at: new Date().toISOString(), season_year: parseInt(seasonYear) })
                .select('id, nfl_id')
                .single();
            if (newGwError) {
                console.error('Error creating new game_week:', newGwError.message);
                throw newGwError;
            }
            gameWeekId = newGw.id;
            console.log(`Created game_week ${gameWeek} with ID: ${gameWeekId}`);
            return newGw;
        } else if (gwError) {
            console.error('Error fetching game_week:', gwError.message);
            throw gwError;
        } else {
            gameWeekId = gameWeekData.id;
            console.log(`Using existing game_week ${gameWeek} with ID: ${gameWeekId}`);
            return gameWeekData;
        }
    } catch (error) {
        console.error('Failed to get/create game_week ID. Aborting.', error);
        process.exit(1);
    }
}

async function saveNflGames(games){
    try {
        const { data, error } = await supabase
            .schema(SCHEMA)
            .from('nfl_games')
            .upsert(games, { onConflict: 'nfl_id', ignoreDuplicates: true })
            .select('*');

        if (error) {
            console.error('Error saving NFL games:', error.message);
            throw error;
        }

        console.log('NFL games saved successfully:', data);
    } catch (error) {
        console.error('Failed to save NFL games:', error);
        throw error;
    }
}


const seasonYear = Deno.args[0];
const gameWeek = Deno.args[1];

//console.log("WEEK MAP ", weekMap);
//const currentRoundId = weekMap[gameWeek]; // Example game_week_id
const currentWeek = await getGameWeek(parseInt(seasonYear), gameWeek);
console.log("Current Week from DB:", currentWeek);
const currentWeekId = currentWeek.id;
const currentRoundId = currentWeek.nfl_id;
console.log("Current Round ID:", currentRoundId);
const games = await getGames(currentWeekId, currentRoundId);
console.log("Games in current round:", games);
if (games && games.length > 0) {
    await saveNflGames(games);
}   


