import { geniusStats } from './config.ts';
import {getAccessToken} from './auth.ts';


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

async function getAPIData (url: string){ 
    const token = await getAccessToken();
    const options = {
    method: 'GET',
    headers: {
        'content-type': 'application/json',
        'x-api-key': geniusStats.apiKey,
        authorization: `Bearer ${token}`
    }
    };

    try {
    const response = await fetch(url, options);
    if (!response.ok) {
        // Read the error body text for better debugging
        const errorBody = await response.text(); 
        throw new Error(`HTTP error! Status: ${response.status}, Body: ${errorBody}`);
    }

    // 3. Status is 2xx, safely parse JSON
    const data = await response.json();
    return { data: data , error: null };

    } catch (error) {
    //console.error(error);
    return {data: null, error:error}
    }
}

export async function getTeams(seasonId: number) {
   

    const url = `https://fixtures.api.geniussports.com/v2/seasons/${seasonId}/competitors?page=1&pageSize=100`;
    const {data, error} = await getAPIData(url);
    if (error) {
        console.error(error);
        return;
    }
    // Process the data as needed

    //console.log('Teams data: ', data);
    const teams = data.items;
    const teamDetails = await Promise.all(teams.map((team:any) => getTeamDetails(team.id)));
    return teamDetails;
}

export async function getTeamDetails(teamId: number){
    console.log("STARTING getting team details", teamId);
    const url = `https://fixtures.api.geniussports.com/v2/competitors/teams/${teamId}`;
    const {data, error} = await getAPIData(url);
    if (error) {
        console.error(error);
        return;
    }
    // Process the data as needed
    if (data ){
        const players = await getPlayersPerTeam(teamId);

        return {
            id: data.id,
            name: data.name,
            abbreviation: data.abbreviation,
            players: players
        };
    }
}

export async function getPlayersPerTeam(teamId: number) {
    

    const url = `https://fixtures.api.geniussports.com/v2/competitors/teams/${teamId}/contracts?page=1&pageSize=100`;
    const {data, error} = await getAPIData(url);
    if (error) {
        console.error(error);
        return;
    }
    // Process the data as needed
    // console.log('Player data: ', data);
    if (data){
        const filterPlayers = data.items.filter((player:any) => {
            return (player.isActive && player.personRole == 'PlaysFor')
        }); // Filter out players without a position
        const players = filterPlayers.map((player:any) => {

            const metaData =  player.metadataProperties.reduce((acc, property) => {
                acc[property.name] = property.value;
                return acc;
            }, {});
            return {
                id: player.player.id,
                name: player.person.fullName,
                firstName: player.person.firstName,
                lastName: player.person.lastName,
                ...metaData
            };
        });
        return players;
    }

    return [];
}

async function getAllPlayers(seasonId: number) {
    const fullTeams = await getTeams(seasonId);
    if (!fullTeams) {
        console.error('No teams data available');
        return;
    }
    const playersWithTeamInfo = fullTeams.flatMap(team => {
    // Extract the team information you want to include in each player object
    const teamInfo = {
        teamId: team.id,
        teamName: team.name,
        teamAbbreviation: team.abbreviation
    };

        // Map each player to a new object that includes the team info
        return team.players.map(player => ({
            ...player, // Spread the existing player properties
            ...teamInfo // Spread the extracted team info
        }));
    });
    return playersWithTeamInfo.length > 0 ? playersWithTeamInfo : [];
}

const season = 158559; // 2025 season Id
console.log("STARTING getting team data ");
const fullTeams  = await getAllPlayers(season);
if (fullTeams && fullTeams.length > 0) {
    await writeFile(fullTeams, './fullTeams.json');
    console.log('Total Number of Players Found: ', fullTeams.length);
    console.log('Player data: ', fullTeams[0]);
} else {
    console.log('No player data found.');
}