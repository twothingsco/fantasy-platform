import yahoolayers from '../yahoo_players.json' with { type: "json" }; 
import espnPlayers from '../espn_players.json' with { type: "json" }; 


const filterPositions = {
  "K": 1,
  "QB": 1,
  "RB": 2,
  "TE": 1,
  "WR": 2,
  "DEF": 1,
  "FLEX": 1
};

const ESPN_POSITION_ID_MAP: { [key: number]: string } = {
  1: "QB",
  2: "RB",
  3: "WR",
  4: "TE",
  5: "K", // Kicker (some sources use 5 for K)
  16: "DEF", // Defense/Special Teams
};

// Get a list of the *positions* you want to keep
const POSITIONS_TO_KEEP = Object.keys(filterPositions).filter(pos => pos !== "FLEX");

// Add RB, WR, and TE to the list for any player that can fill a FLEX slot
POSITIONS_TO_KEEP.push("RB", "WR", "TE");
const UNIQUE_POSITIONS_TO_KEEP = Array.from(new Set(POSITIONS_TO_KEEP));

// Now map the positions to their ESPN IDs
const ESPN_IDS_TO_KEEP = Object.keys(ESPN_POSITION_ID_MAP)
  .filter(id => UNIQUE_POSITIONS_TO_KEEP.includes(ESPN_POSITION_ID_MAP[Number(id)]))
  .map(id => Number(id));

  function filterPlayersByPosition(players: any[]): any[] {
  // Use the filter method on the players array
  const filteredPlayers = players.filter(player => {
    // Check if the player's defaultPositionId is in the list of IDs we want to keep
    return ESPN_IDS_TO_KEEP.includes(player.defaultPositionId);
  });

  return filteredPlayers;
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


// const filterYahooPlayers = yahoolayers.filter(p => p.position_type in filterPositions);
// console.log('Total Filtered Players - ' , filterYahooPlayers.length);
// writeFile(filterYahooPlayers, '../filtered_yahoo_players.json');

const espnFilteredPlayers  = filterPlayersByPosition(espnPlayers);
const cleanPlayers = espnFilteredPlayers.map(player => ({
  nfl_id: player.id,
  player_name: player.fullName,
  player_first_name: player.firstName,
  player_last_name: player.lastName,
  position_type: player.defaultPositionId in ESPN_POSITION_ID_MAP ? ESPN_POSITION_ID_MAP[player.defaultPositionId] : "Unknown",
}));
console.log(cleanPlayers.length); // Should show 3 (TE, QB, DEF)
writeFile(cleanPlayers, '../filtered_espn_players.json');

