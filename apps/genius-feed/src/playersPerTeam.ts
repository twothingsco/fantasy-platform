import { geniusStats } from './config.ts';
import {getAccessToken} from './auth.ts';

export async function getPlayersPerTeam(teamId: number) {
    const token = await getAccessToken();

    const url = `https://fixtures.api.geniussports.com/v2/competitors/teams/${teamId}/contracts?page=1&pageSize=100`;
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
    const data = await response.json();
    console.log(data);
    } catch (error) {
    console.error(error);
    }
}