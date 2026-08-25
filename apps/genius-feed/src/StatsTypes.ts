// Define the structure of the target table's row (Match_Player)
export interface MatchPlayerUpsert {
    nfl_player_id: number;
    game_week_id: number; // Placeholder for the foreign key
    passing_yards?: number;
    passing_tds?: number;
    passing_twoptm?: number; // Two-Point Made from passing
    interceptions_thrown?: number;
    rushing_yards?: number;
    rushing_tds?: number;
    rushing_twoptm?: number; // Two-Point Made from rushing (rush attempted and succeeded)
    receiving_receptions?: number;
    receiving_yards?: number;
    receiving_tds?: number;
    receiving_twoptm?: number; // Two-Point Made from reception
    times_sacked?: number;
    fumbles_lost?: number;
    touch_carries?: number; // Assuming rushes
    touch_receptions?: number; // Assuming receptions
    touches?: number; // Not explicitly mapped, can be calculated (rushes + receptions + passesAttempted)
    targets_receptions?: number; // Assuming receptions count as successful targets
    targets?: number; // Passes targeted at
    reception_percentage?: number; // Calculated: receptions / targets
    rz_target?: number; // Not explicitly mapped in this JSON snippet
    rz_touch?: number; // Not explicitly mapped in this JSON snippet
    rz_g2g?: number; // Not explicitly mapped in this JSON snippet
    pat_made?: number;
    pat_missed?: number;
    fg_made_0_19?: number; // Not explicitly available, will map to a general made field
    fg_made_20_29?: number; // Not explicitly available, will map to a general made field
    fg_made_30_39?: number; // Not explicitly available, will map to a general made field
    fg_made_40_49?: number; // Not explicitly available, will map to a general made field
    fg_made_50_plus?: number; // Not explicitly available, will map to a general made field
    fg_miss_0_19?: number; // Not explicitly available, will map to a general missed field
    fg_miss_20_29?: number; // Not explicitly available, will map to a general missed field
    fg_miss_30_39?: number; // Not explicitly available, will map to a general missed field
    tackles_total?: number;
    tackles_assisted?: number;
    sacks_made?: number;
    tackles_for_loss?: number;
    forced_fumbles?: number;
    fumbles_won?: number; // Fumbles Recoveries From Opponents
    interceptions_caught?: number;
    safeties?: number; // Team-level, will be mapped to a dummy player
    defensive_two_pt_returns?: number; // Not explicitly mapped in this JSON snippet
    blocked_kicks?: number; // Team-level, total of blocked punts/FGs/XPs (not easily mapped)
    passes_defended?: number;
    qb_hits?: number;
    interception_return_yards?: number;
    fumble_return_yards?: number;
    defense_touchdowns?: number;
    points_conceded?: number; // Team-level, will be mapped to a dummy player
    points?: number; // Team-level total points scored. Not a player stat.
    yards_allowed?: number;
}

// Map the API stat keys to the database column names
export const STAT_MAP = {
    // Offensive Stats
    'passesSucceededYards': 'passing_yards',
    'touchdownsPasses': 'passing_tds',
    'twoPointPassSucceeded': 'passing_twoptm',
    'passesIntercepted': 'interceptions_thrown',
    'rushingYards': 'rushing_yards',
    'touchdownsRushing': 'rushing_tds',
    // No dedicated rush two-point success. Assuming success is a conversion made.
    //'receptions': 'receiving_receptions',
    'receptionsYards': 'receiving_yards',
    'touchdownsReceptions': 'receiving_tds',
    'twoPointReceptionSucceeded': 'receiving_twoptm',
    'passesSacked': 'times_sacked',
    'fumblesLost': 'fumbles_lost',
    'rushes': 'touch_carries', // Rush Attempts
    'receptions': 'touch_receptions', // Receptions

    // Kicker Stats
    'extraPointsSucceeded': 'pat_made',
    // API doesn't distinguish missed PATs, will calculate from attempted-succeeded
    'fieldGoalsSucceeded': 'fg_made_general', // Placeholder for now, requires range parsing
    'fieldGoalsMissed': 'fg_miss_general', // Placeholder for now

    // Defensive/Special Teams Stats (Individual)
    'tackles': 'tackles_total',
    'tacklesAssisted': 'tackles_assisted',
    'sacks': 'sacks_made',
    'tacklesForLoss': 'tackles_for_loss',
    'fumblesForced': 'forced_fumbles',
    'fumblesRecoveriesFromOpponents': 'fumbles_won',
    'interceptions': 'interceptions_caught',
    'passesDefended': 'passes_defended',
    'quarterbackHits': 'qb_hits',
    'interceptionsReturnsYards': 'interception_return_yards',
    'fumblesReturnsYards': 'fumble_return_yards',
    'touchdownsReturns': 'defense_touchdowns', // General return TDs
    // 'safeties' is generally a team stat
    // 'blocked_kicks' is generally a team stat
};

// Simplified API structure types for clarity
export type ParticipantStats = {
    [statName: string]: {
        isAvailable: boolean;
        participants?: {
            [playerId: string]: {
                value: number;
                periods?: { [period: string]: number };
            }
        };
        // Team-level stats used for D/ST
        competitors?: {
            [competitorId: string]: {
                value: number;
                periods?: { [period: string]: number };
            }
        }
    }
}