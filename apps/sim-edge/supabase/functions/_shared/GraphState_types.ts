import { Annotation } from "npm:@langchain/langgraph@latest";
import { z } from "npm:zod@latest"; 

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
    gamePhase: Annotation<string|undefined>, // Current phase of the game (e.g., pre_draft, draft, regular_season, playoffs, offseason)
    broadcastMessage: Annotation<Function |undefined>, // Function to broadcast messages to all clients
    current_season: Annotation<number|undefined>, // Current season number
    team_count: Annotation<number|undefined>, // Number of teams in the league
    starting_lineup_size: Annotation<number|undefined>, // starting lineup size.
    starting_position_requirements: Annotation<Record<string, number>|undefined>, // Starting position requirements (e.g., QB: 1, WR: 2, RB: 2)
    league_id: Annotation<number>, // Unique identifier for the league
    league_name: Annotation<string>, // Name of the league
    auth_user_id: Annotation<string>, // auth_user-id of the commisioner
    league_teams: Annotation<Array<Record<string, any>>|undefined>, // List of team dictionaries with name, owner, etc.
    current_week: Annotation<number>, // Current week of the season
    team_roster: Annotation<CombinedOutputType>({ reducer: combineObjectsReducer }), // List of player dictionaries with stats, status etc.
    draft_pool: Annotation<Array<PlayerData>|undefined>,   // All players available for draft
    past_performance: Annotation<Array<PlayerData>|undefined>, // Weekly results for all teams/players
    team_scores: Annotation<Array<Record<string, any>> | undefined>, // Scores for each team per week
    lineup_submitted: Annotation<boolean>,               // Flag for current week's lineup
    waiver_moves: Annotation<Array<Record<string, any>> | undefined>, // Any waiver transactions
    mode_id: Annotation<number|undefined>, // Fantasy mode (1 = Standard, 2 = KOTH, 3 = Position Battle, etc.)

} );

export const GameWeekState = Annotation.Root( {
    league_id: Annotation<number>, // Unique identifier for the league
    league_team_id: Annotation<number>, // Unique identifier for the teams user
    starting_lineup_size: Annotation<number>, // starting lineup size.
    starting_position_requirements: Annotation<Record<string, number>>, // Starting position requirements (e.g., QB: 1, WR: 2, RB: 2)
    league_team_name: Annotation<string>, // Name of the team making the pick
    team_description: Annotation<string>, // Description of the team making the pick
    current_week: Annotation<number>, // Current week of the season
    current_season: Annotation<number>, // Current season number
    team_roster: Annotation<Record<string, any>>, // List of player dictionaries with stats, status etc.
    team_scores: Annotation<Record<string, Array<PlayerData>>>, // Scores for each team per week
    lineup_submitted: Annotation<Array<PlayerData>>, // Flag for current week's lineup
    waiver_moves: Annotation<Array<PlayerData>>, // Any waiver transactions
    game_week_id: Annotation<number>, // Unique identifier for the game week
});


export const DraftState = Annotation.Root( {
    current_season: Annotation<number>, // Current season number
    league_id: Annotation<number>, // Unique identifier for the league
    starting_position_requirements: Annotation<Record<string, number>>, // Starting position requirements (e.g., QB: 1, WR: 2, RB: 2)
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
  roster_slot: z.string().describe("Roster slot for the NFL Player. Valid Slots = [K , QB, RB, TE , WR, DEF , FLEX]"),
  game_week_id: z.number().describe("Game week identifier for the NFL Player."),
  scoring_mode: z.string().describe("Scoring mode for the NFL Player (e.g, ESPN, Yahoo)."),
  fantasy_score: z.number().describe("Fantasy score this player has earned in the current game week."),
 });

 export const lineupSchema = z.object({
   players: z.array(playerSchema).describe("Players in the starting lineup.")
 });

export const teamSchema = z.object({
    name: z.string().describe("Creative Name for your team."),
    description: z.string().describe(
        "Brief overview of your team's strategy and goals."
    )
});

export const leagueSchema = z.object({
    teams: z.array(teamSchema).describe("Teams in the league."),
});


export const DraftPickState = Annotation.Root( {
    league_id: Annotation<number>, // Unique identifier for the league
    pick_id: Annotation<number>, // Unique identifier for the draft pick
    draft_round: Annotation<number>, // Current draft round
    total_draft_rounds: Annotation<number>, // Total rounds in the draft
    total_picks: Annotation<number>, // Total number of picks in the draft
    draft_pick_number: Annotation<number>, // Current pick number in the draft
    league_team_name: Annotation<string>, // Name of the team making the pick
    team_description: Annotation<string>, // Description of the team making the pick
    draft_pool: Annotation<Array<PlayerData>>, // All players available for draft
    current_pick_player: Annotation<PlayerData>, // Player being picked in this round
    starting_position_requirements: Annotation<Record<string, number>>, // Starting position requirements (e.g., QB: 1, WR: 2, RB: 2)
    team_roster: Annotation<Array<PlayerData>>, // Players drafted by the user

});

export type Team = {
    name: string;
    description: string;
    auth_user_id?: string;
    roster?: PlayerData[];
    owner?: string;
    user_id?: number;
    logo_url?: string;
    external_team_id?: string | number;
    team_key?: string;
};

export interface PlayerData {
    player_id?: number;
    player_name: string;
    player_first_name?: string;
    player_last_name?: string;
    nfl_team_name: string;
    nfl_id: string | number;
    source?: string;
    position_type: string;
    game_week_id?: number;
    scoring_mode?: string;
    fantasy_score?: number;
    roster_slot?: string;
}



