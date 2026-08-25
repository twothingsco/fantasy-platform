export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "12.2.3 (519615d)"
  }
  fantasy: {
    Tables: {
      game_week_matchups: {
        Row: {
          away_game_week_team_id: number
          away_team_score: number | null
          created_at: string | null
          game_week_id: number
          home_game_week_team_id: number
          home_team_score: number | null
          id: number
          updated_at: string | null
        }
        Insert: {
          away_game_week_team_id: number
          away_team_score?: number | null
          created_at?: string | null
          game_week_id: number
          home_game_week_team_id: number
          home_team_score?: number | null
          id?: number
          updated_at?: string | null
        }
        Update: {
          away_game_week_team_id?: number
          away_team_score?: number | null
          created_at?: string | null
          game_week_id?: number
          home_game_week_team_id?: number
          home_team_score?: number | null
          id?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "game_week_matchups_away_game_week_team_id_fkey"
            columns: ["away_game_week_team_id"]
            isOneToOne: false
            referencedRelation: "game_week_teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "game_week_matchups_game_week_id_fkey"
            columns: ["game_week_id"]
            isOneToOne: false
            referencedRelation: "game_weeks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "game_week_matchups_home_game_week_team_id_fkey"
            columns: ["home_game_week_team_id"]
            isOneToOne: false
            referencedRelation: "game_week_teams"
            referencedColumns: ["id"]
          },
        ]
      }
      game_week_team_players: {
        Row: {
          created_at: string | null
          game_week_team_id: number | null
          id: number
          nfl_player_id: number | null
          playing: boolean | null
          roster_slot: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          game_week_team_id?: number | null
          id?: number
          nfl_player_id?: number | null
          playing?: boolean | null
          roster_slot?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          game_week_team_id?: number | null
          id?: number
          nfl_player_id?: number | null
          playing?: boolean | null
          roster_slot?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "game_week_team_players_game_week_team_id_fkey"
            columns: ["game_week_team_id"]
            isOneToOne: false
            referencedRelation: "game_week_teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "game_week_team_players_nfl_player_id_fkey"
            columns: ["nfl_player_id"]
            isOneToOne: false
            referencedRelation: "nfl_players"
            referencedColumns: ["id"]
          },
        ]
      }
      game_week_teams: {
        Row: {
          created_at: string | null
          game_week_id: number | null
          id: number
          league_id: number
          updated_at: string | null
          user_id: number | null
        }
        Insert: {
          created_at?: string | null
          game_week_id?: number | null
          id?: number
          league_id?: number
          updated_at?: string | null
          user_id?: number | null
        }
        Update: {
          created_at?: string | null
          game_week_id?: number | null
          id?: number
          league_id?: number
          updated_at?: string | null
          user_id?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_game_week_teams_league"
            columns: ["league_id"]
            isOneToOne: false
            referencedRelation: "leagues"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_game_week_teams_user"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["user_id"]
          },
        ]
      }
      game_weeks: {
        Row: {
          created_at: string | null
          id: number
          number: number | null
          season_year: number | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: number
          number?: number | null
          season_year?: number | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: number
          number?: number | null
          season_year?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      league_settings: {
        Row: {
          allow_trades: boolean
          bench_size: number
          championship_week: number | null
          created_at: string | null
          draft_end_date: string | null
          draft_order_reversed_after_round: boolean
          draft_start_date: string | null
          draft_type: string
          faab_budget: number
          id: number
          league_id: number
          league_status: string
          mode_id: number
          num_playoff_teams: number | null
          picks_per_round: number
          playoff_start_week: number | null
          starting_lineup_size: number
          starting_position_requirements: Json
          total_roster_size: number
          trade_deadline: string | null
          trade_review_period_hours: number | null
          updated_at: string | null
          waiver_run_day: string | null
          waiver_run_time: string | null
          waiver_type: string
        }
        Insert: {
          allow_trades?: boolean
          bench_size?: number
          championship_week?: number | null
          created_at?: string | null
          draft_end_date?: string | null
          draft_order_reversed_after_round?: boolean
          draft_start_date?: string | null
          draft_type?: string
          faab_budget?: number
          id?: number
          league_id: number
          league_status?: string
          mode_id?: number
          num_playoff_teams?: number | null
          picks_per_round?: number
          playoff_start_week?: number | null
          starting_lineup_size?: number
          starting_position_requirements?: Json
          total_roster_size?: number
          trade_deadline?: string | null
          trade_review_period_hours?: number | null
          updated_at?: string | null
          waiver_run_day?: string | null
          waiver_run_time?: string | null
          waiver_type?: string
        }
        Update: {
          allow_trades?: boolean
          bench_size?: number
          championship_week?: number | null
          created_at?: string | null
          draft_end_date?: string | null
          draft_order_reversed_after_round?: boolean
          draft_start_date?: string | null
          draft_type?: string
          faab_budget?: number
          id?: number
          league_id?: number
          league_status?: string
          mode_id?: number
          num_playoff_teams?: number | null
          picks_per_round?: number
          playoff_start_week?: number | null
          starting_lineup_size?: number
          starting_position_requirements?: Json
          total_roster_size?: number
          trade_deadline?: string | null
          trade_review_period_hours?: number | null
          updated_at?: string | null
          waiver_run_day?: string | null
          waiver_run_time?: string | null
          waiver_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_league_settings_league"
            columns: ["league_id"]
            isOneToOne: true
            referencedRelation: "leagues"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_league_settings_mode"
            columns: ["mode_id"]
            isOneToOne: false
            referencedRelation: "modes"
            referencedColumns: ["id"]
          },
        ]
      }
      leagues: {
        Row: {
          commissioner_user_id: number | null
          created_at: string | null
          id: number
          name: string
          updated_at: string | null
        }
        Insert: {
          commissioner_user_id?: number | null
          created_at?: string | null
          id?: number
          name: string
          updated_at?: string | null
        }
        Update: {
          commissioner_user_id?: number | null
          created_at?: string | null
          id?: number
          name?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "leagues_commissioner_user_id_fkey"
            columns: ["commissioner_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["user_id"]
          },
        ]
      }
      match_players: {
        Row: {
          blocked_kicks: number | null
          created_at: string | null
          defense_touchdowns: number | null
          defensive_two_pt_returns: number | null
          fg_made_0_19: number | null
          fg_made_20_29: number | null
          fg_made_30_39: number | null
          fg_made_40_49: number | null
          fg_made_50_plus: number | null
          fg_miss_0_19: number | null
          fg_miss_20_29: number | null
          fg_miss_30_39: number | null
          forced_fumbles: number | null
          fumble_return_yards: number | null
          fumbles_lost: number | null
          fumbles_won: number | null
          game_week_id: number | null
          id: number
          interception_return_yards: number | null
          interceptions_caught: number | null
          interceptions_thrown: number | null
          nfl_player_id: number | null
          passes_defended: number | null
          passing_tds: number | null
          passing_twoptm: number | null
          passing_yards: number | null
          pat_made: number | null
          pat_missed: number | null
          points: number | null
          points_conceded: number | null
          qb_hits: number | null
          receiving_receptions: number | null
          receiving_tds: number | null
          receiving_twoptm: number | null
          receiving_yards: number | null
          reception_percentage: number | null
          rushing_tds: number | null
          rushing_twoptm: number | null
          rushing_yards: number | null
          rz_g2g: number | null
          rz_target: number | null
          rz_touch: number | null
          sacks_made: number | null
          safeties: number | null
          tackles_assisted: number | null
          tackles_for_loss: number | null
          tackles_total: number | null
          targets: number | null
          targets_receptions: number | null
          times_sacked: number | null
          touch_carries: number | null
          touch_receptions: number | null
          touches: number | null
          updated_at: string | null
        }
        Insert: {
          blocked_kicks?: number | null
          created_at?: string | null
          defense_touchdowns?: number | null
          defensive_two_pt_returns?: number | null
          fg_made_0_19?: number | null
          fg_made_20_29?: number | null
          fg_made_30_39?: number | null
          fg_made_40_49?: number | null
          fg_made_50_plus?: number | null
          fg_miss_0_19?: number | null
          fg_miss_20_29?: number | null
          fg_miss_30_39?: number | null
          forced_fumbles?: number | null
          fumble_return_yards?: number | null
          fumbles_lost?: number | null
          fumbles_won?: number | null
          game_week_id?: number | null
          id?: number
          interception_return_yards?: number | null
          interceptions_caught?: number | null
          interceptions_thrown?: number | null
          nfl_player_id?: number | null
          passes_defended?: number | null
          passing_tds?: number | null
          passing_twoptm?: number | null
          passing_yards?: number | null
          pat_made?: number | null
          pat_missed?: number | null
          points?: number | null
          points_conceded?: number | null
          qb_hits?: number | null
          receiving_receptions?: number | null
          receiving_tds?: number | null
          receiving_twoptm?: number | null
          receiving_yards?: number | null
          reception_percentage?: number | null
          rushing_tds?: number | null
          rushing_twoptm?: number | null
          rushing_yards?: number | null
          rz_g2g?: number | null
          rz_target?: number | null
          rz_touch?: number | null
          sacks_made?: number | null
          safeties?: number | null
          tackles_assisted?: number | null
          tackles_for_loss?: number | null
          tackles_total?: number | null
          targets?: number | null
          targets_receptions?: number | null
          times_sacked?: number | null
          touch_carries?: number | null
          touch_receptions?: number | null
          touches?: number | null
          updated_at?: string | null
        }
        Update: {
          blocked_kicks?: number | null
          created_at?: string | null
          defense_touchdowns?: number | null
          defensive_two_pt_returns?: number | null
          fg_made_0_19?: number | null
          fg_made_20_29?: number | null
          fg_made_30_39?: number | null
          fg_made_40_49?: number | null
          fg_made_50_plus?: number | null
          fg_miss_0_19?: number | null
          fg_miss_20_29?: number | null
          fg_miss_30_39?: number | null
          forced_fumbles?: number | null
          fumble_return_yards?: number | null
          fumbles_lost?: number | null
          fumbles_won?: number | null
          game_week_id?: number | null
          id?: number
          interception_return_yards?: number | null
          interceptions_caught?: number | null
          interceptions_thrown?: number | null
          nfl_player_id?: number | null
          passes_defended?: number | null
          passing_tds?: number | null
          passing_twoptm?: number | null
          passing_yards?: number | null
          pat_made?: number | null
          pat_missed?: number | null
          points?: number | null
          points_conceded?: number | null
          qb_hits?: number | null
          receiving_receptions?: number | null
          receiving_tds?: number | null
          receiving_twoptm?: number | null
          receiving_yards?: number | null
          reception_percentage?: number | null
          rushing_tds?: number | null
          rushing_twoptm?: number | null
          rushing_yards?: number | null
          rz_g2g?: number | null
          rz_target?: number | null
          rz_touch?: number | null
          sacks_made?: number | null
          safeties?: number | null
          tackles_assisted?: number | null
          tackles_for_loss?: number | null
          tackles_total?: number | null
          targets?: number | null
          targets_receptions?: number | null
          times_sacked?: number | null
          touch_carries?: number | null
          touch_receptions?: number | null
          touches?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "match_players_game_week_id_fkey"
            columns: ["game_week_id"]
            isOneToOne: false
            referencedRelation: "game_weeks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "match_players_nfl_player_id_fkey"
            columns: ["nfl_player_id"]
            isOneToOne: false
            referencedRelation: "nfl_players"
            referencedColumns: ["id"]
          },
        ]
      }
      modes: {
        Row: {
          blocked_kicks_multiplier: number | null
          created_at: string | null
          defense_touchdowns_multiplier: number | null
          defensive_two_pt_returns_multiplier: number | null
          extra_points_kicked_multiplier: number | null
          extra_points_missed_multiplier: number | null
          fg_made_0_19_multiplier: number | null
          fg_made_20_29_multiplier: number | null
          fg_made_30_39_multiplier: number | null
          fg_made_40_49_multiplier: number | null
          fg_made_50_plus_multiplier: number | null
          forced_fumbles_multiplier: number | null
          fumble_return_yards_multiplier: number | null
          fumbles_lost_multiplier: number | null
          fumbles_won_multiplier: number | null
          id: number
          interception_return_yards_multiplier: number | null
          interceptions_caught_multiplier: number | null
          interceptions_thrown_multiplier: number | null
          name: string
          passes_defended_multiplier: number | null
          passing_tds_multiplier: number | null
          passing_yards_multiplier: number | null
          qb_hits_multiplier: number | null
          receiving_tds_multiplier: number | null
          receiving_yards_multiplier: number | null
          receptions_multiplier: number | null
          rushing_tds_multiplier: number | null
          rushing_yards_multiplier: number | null
          sacks_made_multiplier: number | null
          safeties_multiplier: number | null
          tackles_assisted_multiplier: number | null
          tackles_for_loss_multiplier: number | null
          tackles_total_multiplier: number | null
          times_sacked_multiplier: number | null
          two_pt_conversion_multiplier: number | null
          updated_at: string | null
        }
        Insert: {
          blocked_kicks_multiplier?: number | null
          created_at?: string | null
          defense_touchdowns_multiplier?: number | null
          defensive_two_pt_returns_multiplier?: number | null
          extra_points_kicked_multiplier?: number | null
          extra_points_missed_multiplier?: number | null
          fg_made_0_19_multiplier?: number | null
          fg_made_20_29_multiplier?: number | null
          fg_made_30_39_multiplier?: number | null
          fg_made_40_49_multiplier?: number | null
          fg_made_50_plus_multiplier?: number | null
          forced_fumbles_multiplier?: number | null
          fumble_return_yards_multiplier?: number | null
          fumbles_lost_multiplier?: number | null
          fumbles_won_multiplier?: number | null
          id?: number
          interception_return_yards_multiplier?: number | null
          interceptions_caught_multiplier?: number | null
          interceptions_thrown_multiplier?: number | null
          name: string
          passes_defended_multiplier?: number | null
          passing_tds_multiplier?: number | null
          passing_yards_multiplier?: number | null
          qb_hits_multiplier?: number | null
          receiving_tds_multiplier?: number | null
          receiving_yards_multiplier?: number | null
          receptions_multiplier?: number | null
          rushing_tds_multiplier?: number | null
          rushing_yards_multiplier?: number | null
          sacks_made_multiplier?: number | null
          safeties_multiplier?: number | null
          tackles_assisted_multiplier?: number | null
          tackles_for_loss_multiplier?: number | null
          tackles_total_multiplier?: number | null
          times_sacked_multiplier?: number | null
          two_pt_conversion_multiplier?: number | null
          updated_at?: string | null
        }
        Update: {
          blocked_kicks_multiplier?: number | null
          created_at?: string | null
          defense_touchdowns_multiplier?: number | null
          defensive_two_pt_returns_multiplier?: number | null
          extra_points_kicked_multiplier?: number | null
          extra_points_missed_multiplier?: number | null
          fg_made_0_19_multiplier?: number | null
          fg_made_20_29_multiplier?: number | null
          fg_made_30_39_multiplier?: number | null
          fg_made_40_49_multiplier?: number | null
          fg_made_50_plus_multiplier?: number | null
          forced_fumbles_multiplier?: number | null
          fumble_return_yards_multiplier?: number | null
          fumbles_lost_multiplier?: number | null
          fumbles_won_multiplier?: number | null
          id?: number
          interception_return_yards_multiplier?: number | null
          interceptions_caught_multiplier?: number | null
          interceptions_thrown_multiplier?: number | null
          name?: string
          passes_defended_multiplier?: number | null
          passing_tds_multiplier?: number | null
          passing_yards_multiplier?: number | null
          qb_hits_multiplier?: number | null
          receiving_tds_multiplier?: number | null
          receiving_yards_multiplier?: number | null
          receptions_multiplier?: number | null
          rushing_tds_multiplier?: number | null
          rushing_yards_multiplier?: number | null
          sacks_made_multiplier?: number | null
          safeties_multiplier?: number | null
          tackles_assisted_multiplier?: number | null
          tackles_for_loss_multiplier?: number | null
          tackles_total_multiplier?: number | null
          times_sacked_multiplier?: number | null
          two_pt_conversion_multiplier?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      nfl_player_types: {
        Row: {
          created_at: string | null
          id: number
          type_name: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: number
          type_name?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: number
          type_name?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      nfl_players: {
        Row: {
          created_at: string | null
          id: number
          name: string | null
          nfl_id: string | null
          nfl_team_id: number | null
          position_type: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: number
          name?: string | null
          nfl_id?: string | null
          nfl_team_id?: number | null
          position_type?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: number
          name?: string | null
          nfl_id?: string | null
          nfl_team_id?: number | null
          position_type?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "nfl_players_nfl_team_id_fkey"
            columns: ["nfl_team_id"]
            isOneToOne: false
            referencedRelation: "nfl_teams"
            referencedColumns: ["id"]
          },
        ]
      }
      nfl_teams: {
        Row: {
          created_at: string | null
          id: number
          name: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: number
          name: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: number
          name?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      user_leagues: {
        Row: {
          created_at: string | null
          id: number
          joined_at: string | null
          league_id: number
          role: string | null
          updated_at: string | null
          user_id: number
        }
        Insert: {
          created_at?: string | null
          id?: number
          joined_at?: string | null
          league_id: number
          role?: string | null
          updated_at?: string | null
          user_id: number
        }
        Update: {
          created_at?: string | null
          id?: number
          joined_at?: string | null
          league_id?: number
          role?: string | null
          updated_at?: string | null
          user_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "fk_user_leagues_league"
            columns: ["league_id"]
            isOneToOne: false
            referencedRelation: "leagues"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_user_leagues_user"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["user_id"]
          },
        ]
      }
      user_roster: {
        Row: {
          created_at: string | null
          id: number
          nfl_player_id: number
          season_year: number
          team_name: string | null
          updated_at: string | null
          user_id: number
        }
        Insert: {
          created_at?: string | null
          id?: number
          nfl_player_id: number
          season_year: number
          team_name?: string | null
          updated_at?: string | null
          user_id: number
        }
        Update: {
          created_at?: string | null
          id?: number
          nfl_player_id?: number
          season_year?: number
          team_name?: string | null
          updated_at?: string | null
          user_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "fk_user_roster_nfl_player"
            columns: ["nfl_player_id"]
            isOneToOne: false
            referencedRelation: "nfl_players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_user_roster_user"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["user_id"]
          },
        ]
      }
      users: {
        Row: {
          auth_user_id: string
          created_at: string | null
          name: string | null
          team_description: string | null
          team_name: string | null
          updated_at: string | null
          user_id: number
        }
        Insert: {
          auth_user_id?: string
          created_at?: string | null
          name?: string | null
          team_description?: string | null
          team_name?: string | null
          updated_at?: string | null
          user_id?: number
        }
        Update: {
          auth_user_id?: string
          created_at?: string | null
          name?: string | null
          team_description?: string | null
          team_name?: string | null
          updated_at?: string | null
          user_id?: number
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      draft_picks: {
        Row: {
          created_at: string | null
          id: number
          league_id: number
          nfl_player_id: number | null
          pick_number: number
          round_number: number
          season_year: number
          status: string
          updated_at: string | null
          user_id: number | null
        }
        Insert: {
          created_at?: string | null
          id?: number
          league_id: number
          nfl_player_id?: number | null
          pick_number: number
          round_number: number
          season_year: number
          status?: string
          updated_at?: string | null
          user_id?: number | null
        }
        Update: {
          created_at?: string | null
          id?: number
          league_id?: number
          nfl_player_id?: number | null
          pick_number?: number
          round_number?: number
          season_year?: number
          status?: string
          updated_at?: string | null
          user_id?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_draft_picks_league"
            columns: ["league_id"]
            isOneToOne: false
            referencedRelation: "leagues"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_draft_picks_nfl_player"
            columns: ["nfl_player_id"]
            isOneToOne: false
            referencedRelation: "nfl_players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_draft_picks_user"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["user_id"]
          },
        ]
      }
      game_week_matchups: {
        Row: {
          away_game_week_team_id: number
          away_team_score: number | null
          created_at: string | null
          game_week_id: number
          home_game_week_team_id: number
          home_team_score: number | null
          id: number
          mode_assignments: Json
          updated_at: string | null
        }
        Insert: {
          away_game_week_team_id: number
          away_team_score?: number | null
          created_at?: string | null
          game_week_id: number
          home_game_week_team_id: number
          home_team_score?: number | null
          id?: number
          mode_assignments?: Json
          updated_at?: string | null
        }
        Update: {
          away_game_week_team_id?: number
          away_team_score?: number | null
          created_at?: string | null
          game_week_id?: number
          home_game_week_team_id?: number
          home_team_score?: number | null
          id?: number
          mode_assignments?: Json
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "game_week_matchups_away_game_week_team_id_fkey"
            columns: ["away_game_week_team_id"]
            isOneToOne: false
            referencedRelation: "game_week_teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "game_week_matchups_game_week_id_fkey"
            columns: ["game_week_id"]
            isOneToOne: false
            referencedRelation: "game_weeks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "game_week_matchups_home_game_week_team_id_fkey"
            columns: ["home_game_week_team_id"]
            isOneToOne: false
            referencedRelation: "game_week_teams"
            referencedColumns: ["id"]
          },
        ]
      }
      game_week_team_players: {
        Row: {
          created_at: string | null
          game_week_team_id: number | null
          id: number
          nfl_player_id: number | null
          playing: boolean | null
          roster_slot: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          game_week_team_id?: number | null
          id?: number
          nfl_player_id?: number | null
          playing?: boolean | null
          roster_slot?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          game_week_team_id?: number | null
          id?: number
          nfl_player_id?: number | null
          playing?: boolean | null
          roster_slot?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "game_week_team_players_game_week_team_id_fkey"
            columns: ["game_week_team_id"]
            isOneToOne: false
            referencedRelation: "game_week_teams"
            referencedColumns: ["id"]
          },
        ]
      }
      game_week_teams: {
        Row: {
          created_at: string | null
          game_week_id: number | null
          id: number
          league_id: number
          updated_at: string | null
          user_id: number | null
        }
        Insert: {
          created_at?: string | null
          game_week_id?: number | null
          id?: number
          league_id?: number
          updated_at?: string | null
          user_id?: number | null
        }
        Update: {
          created_at?: string | null
          game_week_id?: number | null
          id?: number
          league_id?: number
          updated_at?: string | null
          user_id?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_game_week_teams_league"
            columns: ["league_id"]
            isOneToOne: false
            referencedRelation: "leagues"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_game_week_teams_user"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["user_id"]
          },
        ]
      }
      game_weeks: {
        Row: {
          created_at: string | null
          id: number
          number: number | null
          season_year: number | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: number
          number?: number | null
          season_year?: number | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: number
          number?: number | null
          season_year?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      kicker_results: {
        Row: {
          fgmade_0_19: number | null
          fgmade_20_29: number | null
          fgmade_30_39: number | null
          fgmade_40_49: number | null
          fgmade_50: number | null
          fgmiss_0_19: number | null
          fgmiss_20_29: number | null
          fgmiss_30_39: number | null
          patmade: number | null
          patmissed: number | null
          playerid: number | null
          playername: string | null
          playeropponent: string | null
          pos: string | null
          rank: number | null
          team: string | null
          totalpoints: number | null
        }
        Insert: {
          fgmade_0_19?: number | null
          fgmade_20_29?: number | null
          fgmade_30_39?: number | null
          fgmade_40_49?: number | null
          fgmade_50?: number | null
          fgmiss_0_19?: number | null
          fgmiss_20_29?: number | null
          fgmiss_30_39?: number | null
          patmade?: number | null
          patmissed?: number | null
          playerid?: number | null
          playername?: string | null
          playeropponent?: string | null
          pos?: string | null
          rank?: number | null
          team?: string | null
          totalpoints?: number | null
        }
        Update: {
          fgmade_0_19?: number | null
          fgmade_20_29?: number | null
          fgmade_30_39?: number | null
          fgmade_40_49?: number | null
          fgmade_50?: number | null
          fgmiss_0_19?: number | null
          fgmiss_20_29?: number | null
          fgmiss_30_39?: number | null
          patmade?: number | null
          patmissed?: number | null
          playerid?: number | null
          playername?: string | null
          playeropponent?: string | null
          pos?: string | null
          rank?: number | null
          team?: string | null
          totalpoints?: number | null
        }
        Relationships: []
      }
      league_settings: {
        Row: {
          allow_trades: boolean
          bench_size: number
          broadcast_channel: string
          championship_week: number | null
          created_at: string | null
          draft_end_date: string | null
          draft_order_reversed_after_round: boolean
          draft_start_date: string | null
          draft_type: string
          faab_budget: number
          id: number
          league_id: number
          league_status: string
          mode_id: number
          num_playoff_teams: number | null
          picks_per_round: number
          playoff_start_week: number | null
          starting_lineup_size: number
          starting_position_requirements: Json
          total_roster_size: number
          trade_deadline: string | null
          trade_review_period_hours: number | null
          updated_at: string | null
          waiver_run_day: string | null
          waiver_run_time: string | null
          waiver_type: string
        }
        Insert: {
          allow_trades?: boolean
          bench_size?: number
          broadcast_channel?: string
          championship_week?: number | null
          created_at?: string | null
          draft_end_date?: string | null
          draft_order_reversed_after_round?: boolean
          draft_start_date?: string | null
          draft_type?: string
          faab_budget?: number
          id?: number
          league_id: number
          league_status?: string
          mode_id?: number
          num_playoff_teams?: number | null
          picks_per_round?: number
          playoff_start_week?: number | null
          starting_lineup_size?: number
          starting_position_requirements?: Json
          total_roster_size?: number
          trade_deadline?: string | null
          trade_review_period_hours?: number | null
          updated_at?: string | null
          waiver_run_day?: string | null
          waiver_run_time?: string | null
          waiver_type?: string
        }
        Update: {
          allow_trades?: boolean
          bench_size?: number
          broadcast_channel?: string
          championship_week?: number | null
          created_at?: string | null
          draft_end_date?: string | null
          draft_order_reversed_after_round?: boolean
          draft_start_date?: string | null
          draft_type?: string
          faab_budget?: number
          id?: number
          league_id?: number
          league_status?: string
          mode_id?: number
          num_playoff_teams?: number | null
          picks_per_round?: number
          playoff_start_week?: number | null
          starting_lineup_size?: number
          starting_position_requirements?: Json
          total_roster_size?: number
          trade_deadline?: string | null
          trade_review_period_hours?: number | null
          updated_at?: string | null
          waiver_run_day?: string | null
          waiver_run_time?: string | null
          waiver_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_league_settings_league"
            columns: ["league_id"]
            isOneToOne: true
            referencedRelation: "leagues"
            referencedColumns: ["id"]
          },
        ]
      }
      leagues: {
        Row: {
          commissioner_user_id: number | null
          created_at: string | null
          id: number
          league_options: Json | null
          name: string
          updated_at: string | null
        }
        Insert: {
          commissioner_user_id?: number | null
          created_at?: string | null
          id?: number
          league_options?: Json | null
          name: string
          updated_at?: string | null
        }
        Update: {
          commissioner_user_id?: number | null
          created_at?: string | null
          id?: number
          league_options?: Json | null
          name?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "leagues_commissioner_user_id_fkey"
            columns: ["commissioner_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["user_id"]
          },
        ]
      }
      match_players: {
        Row: {
          blocked_kicks: number | null
          created_at: string | null
          defense_touchdowns: number | null
          defensive_two_pt_returns: number | null
          fg_made_0_19: number | null
          fg_made_20_29: number | null
          fg_made_30_39: number | null
          fg_made_40_49: number | null
          fg_made_50_plus: number | null
          fg_miss_0_19: number | null
          fg_miss_20_29: number | null
          fg_miss_30_39: number | null
          forced_fumbles: number | null
          fumble_return_yards: number | null
          fumbles_lost: number | null
          fumbles_won: number | null
          game_week_id: number | null
          id: number
          interception_return_yards: number | null
          interceptions_caught: number | null
          interceptions_thrown: number | null
          nfl_player_id: number | null
          passes_defended: number | null
          passing_tds: number | null
          passing_twoptm: number | null
          passing_yards: number | null
          pat_made: number | null
          pat_missed: number | null
          points: number | null
          points_conceded: number | null
          qb_hits: number | null
          receiving_receptions: number | null
          receiving_tds: number | null
          receiving_twoptm: number | null
          receiving_yards: number | null
          reception_percentage: number | null
          rushing_tds: number | null
          rushing_twoptm: number | null
          rushing_yards: number | null
          rz_g2g: number | null
          rz_target: number | null
          rz_touch: number | null
          sacks_made: number | null
          safeties: number | null
          tackles_assisted: number | null
          tackles_for_loss: number | null
          tackles_total: number | null
          targets: number | null
          targets_receptions: number | null
          times_sacked: number | null
          touch_carries: number | null
          touch_receptions: number | null
          touches: number | null
          updated_at: string | null
        }
        Insert: {
          blocked_kicks?: number | null
          created_at?: string | null
          defense_touchdowns?: number | null
          defensive_two_pt_returns?: number | null
          fg_made_0_19?: number | null
          fg_made_20_29?: number | null
          fg_made_30_39?: number | null
          fg_made_40_49?: number | null
          fg_made_50_plus?: number | null
          fg_miss_0_19?: number | null
          fg_miss_20_29?: number | null
          fg_miss_30_39?: number | null
          forced_fumbles?: number | null
          fumble_return_yards?: number | null
          fumbles_lost?: number | null
          fumbles_won?: number | null
          game_week_id?: number | null
          id?: number
          interception_return_yards?: number | null
          interceptions_caught?: number | null
          interceptions_thrown?: number | null
          nfl_player_id?: number | null
          passes_defended?: number | null
          passing_tds?: number | null
          passing_twoptm?: number | null
          passing_yards?: number | null
          pat_made?: number | null
          pat_missed?: number | null
          points?: number | null
          points_conceded?: number | null
          qb_hits?: number | null
          receiving_receptions?: number | null
          receiving_tds?: number | null
          receiving_twoptm?: number | null
          receiving_yards?: number | null
          reception_percentage?: number | null
          rushing_tds?: number | null
          rushing_twoptm?: number | null
          rushing_yards?: number | null
          rz_g2g?: number | null
          rz_target?: number | null
          rz_touch?: number | null
          sacks_made?: number | null
          safeties?: number | null
          tackles_assisted?: number | null
          tackles_for_loss?: number | null
          tackles_total?: number | null
          targets?: number | null
          targets_receptions?: number | null
          times_sacked?: number | null
          touch_carries?: number | null
          touch_receptions?: number | null
          touches?: number | null
          updated_at?: string | null
        }
        Update: {
          blocked_kicks?: number | null
          created_at?: string | null
          defense_touchdowns?: number | null
          defensive_two_pt_returns?: number | null
          fg_made_0_19?: number | null
          fg_made_20_29?: number | null
          fg_made_30_39?: number | null
          fg_made_40_49?: number | null
          fg_made_50_plus?: number | null
          fg_miss_0_19?: number | null
          fg_miss_20_29?: number | null
          fg_miss_30_39?: number | null
          forced_fumbles?: number | null
          fumble_return_yards?: number | null
          fumbles_lost?: number | null
          fumbles_won?: number | null
          game_week_id?: number | null
          id?: number
          interception_return_yards?: number | null
          interceptions_caught?: number | null
          interceptions_thrown?: number | null
          nfl_player_id?: number | null
          passes_defended?: number | null
          passing_tds?: number | null
          passing_twoptm?: number | null
          passing_yards?: number | null
          pat_made?: number | null
          pat_missed?: number | null
          points?: number | null
          points_conceded?: number | null
          qb_hits?: number | null
          receiving_receptions?: number | null
          receiving_tds?: number | null
          receiving_twoptm?: number | null
          receiving_yards?: number | null
          reception_percentage?: number | null
          rushing_tds?: number | null
          rushing_twoptm?: number | null
          rushing_yards?: number | null
          rz_g2g?: number | null
          rz_target?: number | null
          rz_touch?: number | null
          sacks_made?: number | null
          safeties?: number | null
          tackles_assisted?: number | null
          tackles_for_loss?: number | null
          tackles_total?: number | null
          targets?: number | null
          targets_receptions?: number | null
          times_sacked?: number | null
          touch_carries?: number | null
          touch_receptions?: number | null
          touches?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "match_players_game_week_id_fkey"
            columns: ["game_week_id"]
            isOneToOne: false
            referencedRelation: "game_weeks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "match_players_nfl_player_id_fkey"
            columns: ["nfl_player_id"]
            isOneToOne: false
            referencedRelation: "nfl_players"
            referencedColumns: ["id"]
          },
        ]
      }
      match_players_original: {
        Row: {
          created_at: string | null
          defense_touchdowns: number | null
          extra_points_kicked: number | null
          field_goals_kicked: number | null
          fumbles_lost: number | null
          fumbles_won: number | null
          game_week_id: number | null
          id: number
          interceptions_caught: number | null
          interceptions_thrown: number | null
          nfl_player_id: number | null
          passing_tds: number | null
          passing_twoptm: number | null
          passing_yards: number | null
          points: number | null
          points_conceded: number | null
          receiving_tds: number | null
          receiving_twoptm: number | null
          receiving_yards: number | null
          rushing_tds: number | null
          rushing_twoptm: number | null
          rushing_yards: number | null
          sacks_made: number | null
          times_sacked: number | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          defense_touchdowns?: number | null
          extra_points_kicked?: number | null
          field_goals_kicked?: number | null
          fumbles_lost?: number | null
          fumbles_won?: number | null
          game_week_id?: number | null
          id?: number
          interceptions_caught?: number | null
          interceptions_thrown?: number | null
          nfl_player_id?: number | null
          passing_tds?: number | null
          passing_twoptm?: number | null
          passing_yards?: number | null
          points?: number | null
          points_conceded?: number | null
          receiving_tds?: number | null
          receiving_twoptm?: number | null
          receiving_yards?: number | null
          rushing_tds?: number | null
          rushing_twoptm?: number | null
          rushing_yards?: number | null
          sacks_made?: number | null
          times_sacked?: number | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          defense_touchdowns?: number | null
          extra_points_kicked?: number | null
          field_goals_kicked?: number | null
          fumbles_lost?: number | null
          fumbles_won?: number | null
          game_week_id?: number | null
          id?: number
          interceptions_caught?: number | null
          interceptions_thrown?: number | null
          nfl_player_id?: number | null
          passing_tds?: number | null
          passing_twoptm?: number | null
          passing_yards?: number | null
          points?: number | null
          points_conceded?: number | null
          receiving_tds?: number | null
          receiving_twoptm?: number | null
          receiving_yards?: number | null
          rushing_tds?: number | null
          rushing_twoptm?: number | null
          rushing_yards?: number | null
          sacks_made?: number | null
          times_sacked?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      modes: {
        Row: {
          blocked_kicks_multiplier: number | null
          created_at: string | null
          defense_touchdowns_multiplier: number | null
          defensive_two_pt_returns_multiplier: number | null
          description: string | null
          extra_points_kicked_multiplier: number | null
          extra_points_missed_multiplier: number | null
          fg_made_0_19_multiplier: number | null
          fg_made_20_29_multiplier: number | null
          fg_made_30_39_multiplier: number | null
          fg_made_40_49_multiplier: number | null
          fg_made_50_plus_multiplier: number | null
          forced_fumbles_multiplier: number | null
          fumble_return_yards_multiplier: number | null
          fumbles_lost_multiplier: number | null
          fumbles_won_multiplier: number | null
          id: number
          interception_return_yards_multiplier: number | null
          interceptions_caught_multiplier: number | null
          interceptions_thrown_multiplier: number | null
          name: string
          passes_defended_multiplier: number | null
          passing_tds_multiplier: number | null
          passing_yards_multiplier: number | null
          position_affected: Database["public"]["Enums"]["positions"][] | null
          qb_hits_multiplier: number | null
          receiving_tds_multiplier: number | null
          receiving_yards_multiplier: number | null
          receptions_multiplier: number | null
          rushing_tds_multiplier: number | null
          rushing_yards_multiplier: number | null
          sacks_made_multiplier: number | null
          safeties_multiplier: number | null
          tackles_assisted_multiplier: number | null
          tackles_for_loss_multiplier: number | null
          tackles_total_multiplier: number | null
          times_sacked_multiplier: number | null
          two_pt_conversion_multiplier: number | null
          updated_at: string | null
        }
        Insert: {
          blocked_kicks_multiplier?: number | null
          created_at?: string | null
          defense_touchdowns_multiplier?: number | null
          defensive_two_pt_returns_multiplier?: number | null
          description?: string | null
          extra_points_kicked_multiplier?: number | null
          extra_points_missed_multiplier?: number | null
          fg_made_0_19_multiplier?: number | null
          fg_made_20_29_multiplier?: number | null
          fg_made_30_39_multiplier?: number | null
          fg_made_40_49_multiplier?: number | null
          fg_made_50_plus_multiplier?: number | null
          forced_fumbles_multiplier?: number | null
          fumble_return_yards_multiplier?: number | null
          fumbles_lost_multiplier?: number | null
          fumbles_won_multiplier?: number | null
          id?: number
          interception_return_yards_multiplier?: number | null
          interceptions_caught_multiplier?: number | null
          interceptions_thrown_multiplier?: number | null
          name: string
          passes_defended_multiplier?: number | null
          passing_tds_multiplier?: number | null
          passing_yards_multiplier?: number | null
          position_affected?: Database["public"]["Enums"]["positions"][] | null
          qb_hits_multiplier?: number | null
          receiving_tds_multiplier?: number | null
          receiving_yards_multiplier?: number | null
          receptions_multiplier?: number | null
          rushing_tds_multiplier?: number | null
          rushing_yards_multiplier?: number | null
          sacks_made_multiplier?: number | null
          safeties_multiplier?: number | null
          tackles_assisted_multiplier?: number | null
          tackles_for_loss_multiplier?: number | null
          tackles_total_multiplier?: number | null
          times_sacked_multiplier?: number | null
          two_pt_conversion_multiplier?: number | null
          updated_at?: string | null
        }
        Update: {
          blocked_kicks_multiplier?: number | null
          created_at?: string | null
          defense_touchdowns_multiplier?: number | null
          defensive_two_pt_returns_multiplier?: number | null
          description?: string | null
          extra_points_kicked_multiplier?: number | null
          extra_points_missed_multiplier?: number | null
          fg_made_0_19_multiplier?: number | null
          fg_made_20_29_multiplier?: number | null
          fg_made_30_39_multiplier?: number | null
          fg_made_40_49_multiplier?: number | null
          fg_made_50_plus_multiplier?: number | null
          forced_fumbles_multiplier?: number | null
          fumble_return_yards_multiplier?: number | null
          fumbles_lost_multiplier?: number | null
          fumbles_won_multiplier?: number | null
          id?: number
          interception_return_yards_multiplier?: number | null
          interceptions_caught_multiplier?: number | null
          interceptions_thrown_multiplier?: number | null
          name?: string
          passes_defended_multiplier?: number | null
          passing_tds_multiplier?: number | null
          passing_yards_multiplier?: number | null
          position_affected?: Database["public"]["Enums"]["positions"][] | null
          qb_hits_multiplier?: number | null
          receiving_tds_multiplier?: number | null
          receiving_yards_multiplier?: number | null
          receptions_multiplier?: number | null
          rushing_tds_multiplier?: number | null
          rushing_yards_multiplier?: number | null
          sacks_made_multiplier?: number | null
          safeties_multiplier?: number | null
          tackles_assisted_multiplier?: number | null
          tackles_for_loss_multiplier?: number | null
          tackles_total_multiplier?: number | null
          times_sacked_multiplier?: number | null
          two_pt_conversion_multiplier?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      nfl_defensive_results: {
        Row: {
          blk: number | null
          pdef: number | null
          playerid: number | null
          playername: string | null
          playeropponent: string | null
          pos: string | null
          qbhit: number | null
          rank: number | null
          returnfumyds: number | null
          returnintyds: number | null
          scoreblktd: number | null
          scoredef2ptret: number | null
          scorefumtd: number | null
          scoreinttd: number | null
          scoresaf: number | null
          tacklesast: number | null
          tacklessck: number | null
          tacklestfl: number | null
          tacklestot: number | null
          team: string | null
          totalpoints: number | null
          turnoverfrcfum: number | null
          turnoverfumrec: number | null
          turnoverint: number | null
        }
        Insert: {
          blk?: number | null
          pdef?: number | null
          playerid?: number | null
          playername?: string | null
          playeropponent?: string | null
          pos?: string | null
          qbhit?: number | null
          rank?: number | null
          returnfumyds?: number | null
          returnintyds?: number | null
          scoreblktd?: number | null
          scoredef2ptret?: number | null
          scorefumtd?: number | null
          scoreinttd?: number | null
          scoresaf?: number | null
          tacklesast?: number | null
          tacklessck?: number | null
          tacklestfl?: number | null
          tacklestot?: number | null
          team?: string | null
          totalpoints?: number | null
          turnoverfrcfum?: number | null
          turnoverfumrec?: number | null
          turnoverint?: number | null
        }
        Update: {
          blk?: number | null
          pdef?: number | null
          playerid?: number | null
          playername?: string | null
          playeropponent?: string | null
          pos?: string | null
          qbhit?: number | null
          rank?: number | null
          returnfumyds?: number | null
          returnintyds?: number | null
          scoreblktd?: number | null
          scoredef2ptret?: number | null
          scorefumtd?: number | null
          scoreinttd?: number | null
          scoresaf?: number | null
          tacklesast?: number | null
          tacklessck?: number | null
          tacklestfl?: number | null
          tacklestot?: number | null
          team?: string | null
          totalpoints?: number | null
          turnoverfrcfum?: number | null
          turnoverfumrec?: number | null
          turnoverint?: number | null
        }
        Relationships: []
      }
      nfl_player_types: {
        Row: {
          created_at: string | null
          id: number
          type_name: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: number
          type_name?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: number
          type_name?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      nfl_players: {
        Row: {
          created_at: string | null
          firstname: string | null
          id: number
          lastname: string | null
          name: string | null
          nfl_id: string | null
          nfl_team_id: number | null
          position_type: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          firstname?: string | null
          id?: number
          lastname?: string | null
          name?: string | null
          nfl_id?: string | null
          nfl_team_id?: number | null
          position_type?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          firstname?: string | null
          id?: number
          lastname?: string | null
          name?: string | null
          nfl_id?: string | null
          nfl_team_id?: number | null
          position_type?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "nfl_players_nfl_team_id_fkey"
            columns: ["nfl_team_id"]
            isOneToOne: false
            referencedRelation: "nfl_teams"
            referencedColumns: ["id"]
          },
        ]
      }
      nfl_results: {
        Row: {
          "2pt": number | null
          fanptsagainst_pts: number | null
          fum: number | null
          fumtd: number | null
          passingint: number | null
          passingtd: number | null
          passingyds: number | null
          playerid: number | null
          playername: string | null
          playeropponent: string | null
          pos: string | null
          rank: number | null
          receivingrec: number | null
          receivingtd: number | null
          receivingyds: number | null
          receptionpercentage: number | null
          rettd: number | null
          rushingtd: number | null
          rushingyds: number | null
          rzg2g: number | null
          rztarget: number | null
          rztouch: number | null
          targets: number | null
          targetsreceptions: number | null
          team: string | null
          totalpoints: number | null
          touchcarries: number | null
          touches: number | null
          touchreceptions: number | null
        }
        Insert: {
          "2pt"?: number | null
          fanptsagainst_pts?: number | null
          fum?: number | null
          fumtd?: number | null
          passingint?: number | null
          passingtd?: number | null
          passingyds?: number | null
          playerid?: number | null
          playername?: string | null
          playeropponent?: string | null
          pos?: string | null
          rank?: number | null
          receivingrec?: number | null
          receivingtd?: number | null
          receivingyds?: number | null
          receptionpercentage?: number | null
          rettd?: number | null
          rushingtd?: number | null
          rushingyds?: number | null
          rzg2g?: number | null
          rztarget?: number | null
          rztouch?: number | null
          targets?: number | null
          targetsreceptions?: number | null
          team?: string | null
          totalpoints?: number | null
          touchcarries?: number | null
          touches?: number | null
          touchreceptions?: number | null
        }
        Update: {
          "2pt"?: number | null
          fanptsagainst_pts?: number | null
          fum?: number | null
          fumtd?: number | null
          passingint?: number | null
          passingtd?: number | null
          passingyds?: number | null
          playerid?: number | null
          playername?: string | null
          playeropponent?: string | null
          pos?: string | null
          rank?: number | null
          receivingrec?: number | null
          receivingtd?: number | null
          receivingyds?: number | null
          receptionpercentage?: number | null
          rettd?: number | null
          rushingtd?: number | null
          rushingyds?: number | null
          rzg2g?: number | null
          rztarget?: number | null
          rztouch?: number | null
          targets?: number | null
          targetsreceptions?: number | null
          team?: string | null
          totalpoints?: number | null
          touchcarries?: number | null
          touches?: number | null
          touchreceptions?: number | null
        }
        Relationships: []
      }
      nfl_teams: {
        Row: {
          abbreviation: string
          created_at: string | null
          id: number
          name: string
          nfl_id: string | null
          updated_at: string | null
        }
        Insert: {
          abbreviation: string
          created_at?: string | null
          id?: number
          name: string
          nfl_id?: string | null
          updated_at?: string | null
        }
        Update: {
          abbreviation?: string
          created_at?: string | null
          id?: number
          name?: string
          nfl_id?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      user_leagues: {
        Row: {
          created_at: string | null
          id: number
          joined_at: string | null
          league_id: number
          role: string | null
          updated_at: string | null
          user_id: number
        }
        Insert: {
          created_at?: string | null
          id?: number
          joined_at?: string | null
          league_id: number
          role?: string | null
          updated_at?: string | null
          user_id: number
        }
        Update: {
          created_at?: string | null
          id?: number
          joined_at?: string | null
          league_id?: number
          role?: string | null
          updated_at?: string | null
          user_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "fk_user_leagues_league"
            columns: ["league_id"]
            isOneToOne: false
            referencedRelation: "leagues"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_user_leagues_user"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["user_id"]
          },
        ]
      }
      user_roster: {
        Row: {
          created_at: string | null
          id: number
          nfl_player_id: number
          season_year: number
          team_name: string | null
          updated_at: string | null
          user_id: number
        }
        Insert: {
          created_at?: string | null
          id?: number
          nfl_player_id: number
          season_year: number
          team_name?: string | null
          updated_at?: string | null
          user_id: number
        }
        Update: {
          created_at?: string | null
          id?: number
          nfl_player_id?: number
          season_year?: number
          team_name?: string | null
          updated_at?: string | null
          user_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "fk_user_roster_nfl_player"
            columns: ["nfl_player_id"]
            isOneToOne: false
            referencedRelation: "nfl_players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_user_roster_user"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["user_id"]
          },
        ]
      }
      users: {
        Row: {
          auth_user_id: string
          created_at: string | null
          name: string | null
          team_description: string | null
          team_name: string | null
          updated_at: string | null
          user_id: number
        }
        Insert: {
          auth_user_id?: string
          created_at?: string | null
          name?: string | null
          team_description?: string | null
          team_name?: string | null
          updated_at?: string | null
          user_id?: number
        }
        Update: {
          auth_user_id?: string
          created_at?: string | null
          name?: string | null
          team_description?: string | null
          team_name?: string | null
          updated_at?: string | null
          user_id?: number
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      calculate_leaderboard: {
        Args: {
          p_game_week_number: number
          p_league_id: number
          p_season_year: number
        }
        Returns: {
          losses: number
          team_name: string
          ties: number
          total_team_fantasy_score: number
          user_id: number
          wins: number
        }[]
      }
      calculate_player_score: {
        Args: {
          p_game_week_id: number
          p_mode_id: number
          p_nfl_player_id: number
        }
        Returns: number
      }
      create_user_roster_from_draft: {
        Args: { p_league_id: number; p_season_year: number }
        Returns: string
      }
      generate_key: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      get_available_draft_pool: {
        Args: {
          p_game_week_number: number
          p_league_id: number
          p_mode_name: string
          p_season_year: number
        }
        Returns: {
          fantasy_score: number
          game_week_id_internal: number
          nfl_team_name: string
          player_id: number
          player_name: string
          position_type: string
          scoring_mode: string
        }[]
      }
      get_draft_pool: {
        Args: {
          p_game_week_number: number
          p_mode_name: string
          p_season_year: number
        }
        Returns: {
          fantasy_score: number
          game_week_id_internal: number
          nfl_team_name: string
          player_id: number
          player_name: string
          position_type: string
          scoring_mode: string
        }[]
      }
      get_individual_player_fantasy_scores: {
        Args: {
          p_game_week_number: number
          p_league_id: number
          p_season_year: number
        }
        Returns: {
          fantasy_score: number
          game_week_match_id: number
          game_week_number: number
          game_week_team_id: number
          nfl_team_name: string
          player_name: string
          position_type: string
          scoring_mode: string
          season_year: number
          user_fantasy_team_name: string
          user_name: string
        }[]
      }
      get_league_schedule: {
        Args: { p_league_id: number; p_season_year: number }
        Returns: {
          away_team_name: string
          away_team_score: number
          away_user_id: number
          game_week_number: number
          home_team_name: string
          home_team_score: number
          home_user_id: number
          league_id: number
          match_id: number
          season_year: number
        }[]
      }
      get_player_fantasy_scores: {
        Args: {
          p_game_week_number: number
          p_mode_name: string
          p_season_year: number
        }
        Returns: {
          fantasy_score: number
          game_week_id_internal: number
          nfl_team_name: string
          player_id: number
          player_name: string
          position_type: string
          scoring_mode: string
        }[]
      }
      get_team_fantasy_scores: {
        Args: {
          p_game_week_number: number
          p_league_id: number
          p_season_year: number
        }
        Returns: {
          game_week_number: number
          game_week_team_id: number
          season_year: number
          total_team_fantasy_score: number
          user_name: string
          user_team_name: string
        }[]
      }
      get_team_roster_with_scores: {
        Args: {
          p_game_week_number: number
          p_league_id: number
          p_season_year: number
        }
        Returns: {
          fantasy_score: number
          game_week_number: number
          nfl_team_name: string
          player_name: string
          position_type: string
          season_year: number
          user_fantasy_team_name: string
          user_name: string
        }[]
      }
      is_member_of_league: {
        Args: { p_league_id: number }
        Returns: boolean
      }
      populate_snake_draft: {
        Args: { p_league_id: number; p_season_year: number }
        Returns: string
      }
    }
    Enums: {
      positions: "ALL" | "QB" | "RB" | "WR" | "TE" | "K" | "DEF" | "FLEX"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  fantasy: {
    Enums: {},
  },
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      positions: ["ALL", "QB", "RB", "WR", "TE", "K", "DEF", "FLEX"],
    },
  },
} as const
