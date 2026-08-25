

import { PlayerData } from "../_shared/GraphState_types.ts";

// Define the type for the Yahoo API response data
type YahooPlayerApiResponse = {
  fantasy_content: {
    game: [
      {
        game_key: string;
        game_id: string;
        name: string;
        code: string;
        type: string;
        url: string;
        season: string;
      },
      {
        players: Record<string, {
          player: Array<Array<{
            player_key?: string;
            player_id?: string;
            name?: { full: string; first: string; last: string };
            editorial_team_full_name?: string;
            editorial_team_abbr?: string;
            position_type?: string;
            eligible_positions?: Array<{ position: string }>;
            selected_position?: string;
          }>>;
        }>;
      }
    ];
  };
};

// Define the final mapped type for the player data
type YahooPlayer = {
  player_key: string;
  name: { full: string; first: string; last: string };
  editorial_team_full_name: string;
  editorial_team_abbr: string;
  position_type: string;
  selected_position: string;
};


// Function to fetch and process the player data
async function fetchYahooNflPlayers(access_token: string, start: number, count: number): Promise<YahooPlayer[]> {
    const url = `https://fantasysports.yahooapis.com/fantasy/v2/game/nfl/players;start=${start};count=${count}?format=json`;

    if (!access_token) {
        throw new Error("Missing access token.");
    }

    try {
        const response = await fetch(url, {
            method: "GET",
            headers: {
                "Authorization": `Bearer ${access_token}`,
                "Content-Type": "application/json",
            },
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data: YahooPlayerApiResponse = await response.json();
        const playersData = data.fantasy_content.game[1]?.players;

        if (!playersData) {
            console.warn("No 'players' data found in the response.");
            return [];
        }

        // Map the fetched data to the YahooPlayer type
        const mappedPlayers: YahooPlayer[] = Object.values(playersData).map((playerObject) => {
            if (!playerObject.player || playerObject.player.length === 0) {
                return null;
            }
            const playerInfo = playerObject.player[0];
            const player_key = playerInfo.find(item => "player_key" in item)?.player_key || "";
            const name = playerInfo.find(item => "name" in item)?.name || { full: "", first: "", last: "" };
            const editorial_team_full_name = playerInfo.find(item => "editorial_team_full_name" in item)?.editorial_team_full_name || "";
            const editorial_team_abbr = playerInfo.find(item => "editorial_team_abbr" in item)?.editorial_team_abbr || "";
            const position_type = playerInfo.find(item => "position_type" in item)?.position_type || "";
            const eligible_positions = playerInfo.find(item => "eligible_positions" in item)?.eligible_positions;
            const selected_position = playerInfo.find(item => "selected_position" in item)?.selected_position || (eligible_positions?.[0]?.position) || "";
            
            return {
                player_key: player_key,
                name: name,
                editorial_team_full_name: editorial_team_full_name,
                editorial_team_abbr: editorial_team_abbr,
                position_type: position_type,
                selected_position: selected_position
            };
        }).filter(Boolean) as YahooPlayer[];

        return mappedPlayers;
    } catch (error) {
        console.error("Failed to fetch player data:", error);
        throw error;
    }
}

// Function to save the complete player list to a local JSON file
async function savePlayersToFile(players: PlayerData[], filename: string): Promise<void> {
    try {
        const jsonString = JSON.stringify(players, null, 2);
        await Deno.writeTextFile(filename, jsonString);
        console.log(`Successfully saved ${players.length} players to ${filename}`);
    } catch (error) {
        console.error(`Failed to save player data to file:`, error);
        throw error;
    }
}

export async function mapAndSaveAllYahooPlayers(access_token: string, refresh_token?: string): Promise<PlayerData[]> {
    const allPlayers: PlayerData[] = [];
    const count = 25;
    let start = 0;
    let fetchedPlayersCount = 0;

    console.log("Starting to fetch all NFL players from Yahoo Fantasy Sports API...");

    do {
        const yahooPlayers = await fetchYahooNflPlayers(access_token, start, count);
        fetchedPlayersCount = yahooPlayers.length;

        if (fetchedPlayersCount > 0) {
            const mappedPlayers: PlayerData[] = yahooPlayers.map(player => {
                return {
                    player_name: player.name.full,
                    player_first_name: player.name.first,
                    player_last_name: player.name.last,
                    nfl_team_name: player.editorial_team_abbr,
                    nfl_id: player.player_key,
                    position_type: player.selected_position
                };
            });
            allPlayers.push(...mappedPlayers);
            console.log(`Fetched and mapped ${fetchedPlayersCount} players. Total players so far: ${allPlayers.length}`);
            start += count;
        }
    } while (fetchedPlayersCount === count);

    return allPlayers;
    // await savePlayersToFile(allPlayers, "yahoo_nfl_players.json");
}