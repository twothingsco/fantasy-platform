// --- Type Definitions for CSV Row and Supabase Tables ---


// Define the expected structure for data fetched from 'nfl_players'
export interface NflPlayerFromDb {
    id: number; // Primary key of nfl_players table
    nfl_id: string; // External NFL ID, ensure it's not null in your DB schema
    // Add other fields if you select them in the .select() call
}

export interface UserRosterInsert {
    user_id: number;
    nfl_player_id: number; // This is the 'id' from nfl_players
    team_name?: string;
    season_year?: number
    // created_at and updated_at will be defaulted by Supabase
}
export interface GameWeekTeamPlayerInsert {
    game_week_team_id: number;
    nfl_player_id: number; // This is the 'id' from nfl_players
    roster_slot?: string;
    playing?: boolean;
}
