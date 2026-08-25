import { Annotation } from "@langchain/langgraph";
import { z } from "zod"; 

 interface CombinedOutputType {
    [key: string]: any; // Or a more specific interface if you know the structure
}
// The object combining reducer function (as defined in the previous response)
function combineObjectsReducer<T extends Record<string, any>>(
    accumulator: T | undefined,
    newValue: T
): T {
    if (!accumulator) {
        return newValue;
    }
    return { ...accumulator, ...newValue };
}
 
 export const  FantasyFootballState = Annotation.Root( {
    gamePhase: Annotation<string>, // Current phase of the game (e.g., pre_draft, draft, regular_season, playoffs, offseason)
    broadcastMessage: Annotation<Function>, // Function to broadcast messages to all clients
    current_season: Annotation<number>, // Current season number
    team_count: Annotation<number>, // Number of teams in the league
    league_teams: Annotation<Array<Record<string, any>>>, // List of team dictionaries with name, owner, etc.
    current_week: Annotation<number>, // Current week of the season
    team_roster: Annotation<CombinedOutputType>({ reducer: combineObjectsReducer }), // List of player dictionaries with stats, status etc.
    draft_pool: Annotation<Array<PlayerData>>,   // All players available for draft
    past_performance: Annotation<Array<PlayerData>>, // Weekly results for all teams/players
    team_scores: Annotation<Array<Record<string, any>>>, // Scores for each team per week
    lineup_submitted: Annotation<boolean>,               // Flag for current week's lineup
    waiver_moves: Annotation<Array<Record<string, any>>>, // Any waiver transactions

} );

export const GameWeekState = Annotation.Root( {
    broadcastMessage: Annotation<Function>, // Function to broadcast messages to all clients
    league_team_name: Annotation<string>, // Name of the team making the pick
    team_description: Annotation<string>, // Description of the team making the pick
    current_week: Annotation<number>, // Current week of the season
    team_roster: Annotation<Record<string, any>>, // List of player dictionaries with stats, status etc.
    team_scores: Annotation<Record<string, Array<PlayerData>>>, // Scores for each team per week
    lineup_submitted: Annotation<Array<PlayerData>>, // Flag for current week's lineup
    waiver_moves: Annotation<Array<PlayerData>>, // Any waiver transactions
    game_week_id: Annotation<number>, // Unique identifier for the game week
});


export const DraftState = Annotation.Root( {
    broadcastMessage: Annotation<Function>, // Function to broadcast messages to all clients
    draft_round: Annotation<number>, // Current draft round
    draft_pick_number: Annotation<number>, // Current pick number in the draft
    league_teams: Annotation<Array<Record<string, any>>>, // List of team dictionaries with name, owner, etc.
    current_team_index: Annotation<number>, // Current team making a pick
    total_draft_rounds: Annotation<number>, // Total rounds in the draft
    draft_pool: Annotation<Array<PlayerData>>, // All players available for draft
    team_roster: Annotation<Record<string, any>>, // Players drafted by the user
});

export const playerSchema = z.object({
  player_id: z.number().describe("Unique identifier for the NFL Player."),
  player_name: z.string().describe("Name for the NFL Player."),
  nfl_team_name: z.string().describe("Name of the NFL Team the player is associated with."),
  position_type: z.string().describe("Position type of the NFL Player (e.g, QB, WR, RB)."),
  game_week_id: z.number().describe("Game week identifier for the NFL Player."),
  scoring_mode: z.string().describe("Scoring mode for the NFL Player (e.g, ESPN, Yahoo)."),
  fantasy_score: z.number().describe("Fantasy score this player has earned in the current game week."),
 });

 export const lineupSchema = z.object({
   players: z.array(playerSchema).describe("Players in the starting lineup.")
 });



export const DraftPickState = Annotation.Root( {
    broadcastMessage: Annotation<Function>, // Function to broadcast messages to all clients
    draft_round: Annotation<number>, // Current draft round
    draft_pick_number: Annotation<number>, // Current pick number in the draft
    league_team_name: Annotation<string>, // Name of the team making the pick
    team_description: Annotation<string>, // Description of the team making the pick
    draft_pool: Annotation<Array<PlayerData>>, // All players available for draft
    current_pick_player: Annotation<PlayerData>, // Player being picked in this round
    team_roster: Annotation<Array<PlayerData>>, // Players drafted by the user

});


export interface PlayerData {
    player_id: number;
    player_name: string;
    nfl_team_name: string;
    position_type: string;
    game_week_id: number;
    scoring_mode: string;
    fantasy_score: number;
}



