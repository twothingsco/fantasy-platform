export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
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
            referencedRelation: "game_week_teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "game_week_matchups_game_week_id_fkey"
            columns: ["game_week_id"]
            referencedRelation: "game_weeks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "game_week_matchups_home_game_week_team_id_fkey"
            columns: ["home_game_week_team_id"]
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
            referencedRelation: "leagues"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_game_week_teams_user"
            columns: ["user_id"]
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
            referencedRelation: "leagues"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_league_settings_mode"
            columns: ["mode_id"]
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
          league_options?: Record<string, any> | null
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
            referencedRelation: "game_weeks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "match_players_nfl_player_id_fkey"
            columns: ["nfl_player_id"]
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
            referencedRelation: "nfl_teams"
            referencedColumns: ["id"]
          },
        ]
      }
      nfl_teams: {
        Row: {
          created_at: string | null
          id: number
          name: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: number
          name?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: number
          name?: string | null
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
            referencedRelation: "leagues"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_user_leagues_user"
            columns: ["user_id"]
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
            foreignKeyName: "fk_user_roster_user"
            columns: ["user_id"]
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
          query?: string
          operationName?: string
          variables?: Json
          extensions?: Json
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
  pgbouncer: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_auth: {
        Args: { p_usename: string }
        Returns: {
          username: string
          password: string
        }[]
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
      test: {
        Row: {
          created_at: string
          id: number
          message: string | null
        }
        Insert: {
          created_at?: string
          id?: number
          message?: string | null
        }
        Update: {
          created_at?: string
          id?: number
          message?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_individual_player_fantasy_scores: {
        Args: {
          p_game_week_number: number
          p_season_year: number
          p_league_id: number
        }
        Returns: {
          game_week_number: number
          season_year: number
          user_fantasy_team_name: string
          user_name: string
          game_week_team_id: number
          player_name: string
          nfl_team_name: string
          position_type: string
          fantasy_score: number
        }[]
      }
      get_player_fantasy_scores: {
        Args: {
          p_game_week_number: number
          p_season_year: number
          p_mode_name: string
        }
        Returns: {
          scoring_mode: string
          player_id: number
          player_name: string
          nfl_team_name: string
          position_type: string
          game_week_id_internal: number
          fantasy_score: number
        }[]
      }
      get_team_fantasy_scores: {
        Args: {
          p_game_week_number: number
          p_season_year: number
          p_league_id: number
        }
        Returns: {
          game_week_number: number
          season_year: number
          game_week_team_id: number
          user_name: string
          user_team_name: string
          scoring_mode: string
          total_team_fantasy_score: number
        }[]
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  storage: {
    Tables: {
      buckets: {
        Row: {
          allowed_mime_types: string[] | null
          avif_autodetection: boolean | null
          created_at: string | null
          file_size_limit: number | null
          id: string
          name: string
          owner: string | null
          owner_id: string | null
          public: boolean | null
          type: Database["storage"]["Enums"]["buckettype"]
          updated_at: string | null
        }
        Insert: {
          allowed_mime_types?: string[] | null
          avif_autodetection?: boolean | null
          created_at?: string | null
          file_size_limit?: number | null
          id: string
          name: string
          owner?: string | null
          owner_id?: string | null
          public?: boolean | null
          type?: Database["storage"]["Enums"]["buckettype"]
          updated_at?: string | null
        }
        Update: {
          allowed_mime_types?: string[] | null
          avif_autodetection?: boolean | null
          created_at?: string | null
          file_size_limit?: number | null
          id?: string
          name?: string
          owner?: string | null
          owner_id?: string | null
          public?: boolean | null
          type?: Database["storage"]["Enums"]["buckettype"]
          updated_at?: string | null
        }
        Relationships: []
      }
      buckets_analytics: {
        Row: {
          created_at: string
          format: string
          id: string
          type: Database["storage"]["Enums"]["buckettype"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          format?: string
          id: string
          type?: Database["storage"]["Enums"]["buckettype"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          format?: string
          id?: string
          type?: Database["storage"]["Enums"]["buckettype"]
          updated_at?: string
        }
        Relationships: []
      }
      iceberg_namespaces: {
        Row: {
          bucket_id: string
          created_at: string
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          bucket_id: string
          created_at?: string
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          bucket_id?: string
          created_at?: string
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "iceberg_namespaces_bucket_id_fkey"
            columns: ["bucket_id"]
            referencedRelation: "buckets_analytics"
            referencedColumns: ["id"]
          },
        ]
      }
      iceberg_tables: {
        Row: {
          bucket_id: string
          created_at: string
          id: string
          location: string
          name: string
          namespace_id: string
          updated_at: string
        }
        Insert: {
          bucket_id: string
          created_at?: string
          id?: string
          location: string
          name: string
          namespace_id: string
          updated_at?: string
        }
        Update: {
          bucket_id?: string
          created_at?: string
          id?: string
          location?: string
          name?: string
          namespace_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "iceberg_tables_bucket_id_fkey"
            columns: ["bucket_id"]
            referencedRelation: "buckets_analytics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "iceberg_tables_namespace_id_fkey"
            columns: ["namespace_id"]
            referencedRelation: "iceberg_namespaces"
            referencedColumns: ["id"]
          },
        ]
      }
      migrations: {
        Row: {
          executed_at: string | null
          hash: string
          id: number
          name: string
        }
        Insert: {
          executed_at?: string | null
          hash: string
          id: number
          name: string
        }
        Update: {
          executed_at?: string | null
          hash?: string
          id?: number
          name?: string
        }
        Relationships: []
      }
      objects: {
        Row: {
          bucket_id: string | null
          created_at: string | null
          id: string
          last_accessed_at: string | null
          level: number | null
          metadata: Json | null
          name: string | null
          owner: string | null
          owner_id: string | null
          path_tokens: string[] | null
          updated_at: string | null
          user_metadata: Json | null
          version: string | null
        }
        Insert: {
          bucket_id?: string | null
          created_at?: string | null
          id?: string
          last_accessed_at?: string | null
          level?: number | null
          metadata?: Json | null
          name?: string | null
          owner?: string | null
          owner_id?: string | null
          path_tokens?: string[] | null
          updated_at?: string | null
          user_metadata?: Json | null
          version?: string | null
        }
        Update: {
          bucket_id?: string | null
          created_at?: string | null
          id?: string
          last_accessed_at?: string | null
          level?: number | null
          metadata?: Json | null
          name?: string | null
          owner?: string | null
          owner_id?: string | null
          path_tokens?: string[] | null
          updated_at?: string | null
          user_metadata?: Json | null
          version?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "objects_bucketId_fkey"
            columns: ["bucket_id"]
            referencedRelation: "buckets"
            referencedColumns: ["id"]
          },
        ]
      }
      prefixes: {
        Row: {
          bucket_id: string
          created_at: string | null
          level: number
          name: string
          updated_at: string | null
        }
        Insert: {
          bucket_id: string
          created_at?: string | null
          level?: number
          name: string
          updated_at?: string | null
        }
        Update: {
          bucket_id?: string
          created_at?: string | null
          level?: number
          name?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "prefixes_bucketId_fkey"
            columns: ["bucket_id"]
            referencedRelation: "buckets"
            referencedColumns: ["id"]
          },
        ]
      }
      s3_multipart_uploads: {
        Row: {
          bucket_id: string
          created_at: string
          id: string
          in_progress_size: number
          key: string
          owner_id: string | null
          upload_signature: string
          user_metadata: Json | null
          version: string
        }
        Insert: {
          bucket_id: string
          created_at?: string
          id: string
          in_progress_size?: number
          key: string
          owner_id?: string | null
          upload_signature: string
          user_metadata?: Json | null
          version: string
        }
        Update: {
          bucket_id?: string
          created_at?: string
          id?: string
          in_progress_size?: number
          key?: string
          owner_id?: string | null
          upload_signature?: string
          user_metadata?: Json | null
          version?: string
        }
        Relationships: [
          {
            foreignKeyName: "s3_multipart_uploads_bucket_id_fkey"
            columns: ["bucket_id"]
            referencedRelation: "buckets"
            referencedColumns: ["id"]
          },
        ]
      }
      s3_multipart_uploads_parts: {
        Row: {
          bucket_id: string
          created_at: string
          etag: string
          id: string
          key: string
          owner_id: string | null
          part_number: number
          size: number
          upload_id: string
          version: string
        }
        Insert: {
          bucket_id: string
          created_at?: string
          etag: string
          id?: string
          key: string
          owner_id?: string | null
          part_number: number
          size?: number
          upload_id: string
          version: string
        }
        Update: {
          bucket_id?: string
          created_at?: string
          etag?: string
          id?: string
          key?: string
          owner_id?: string | null
          part_number?: number
          size?: number
          upload_id?: string
          version?: string
        }
        Relationships: [
          {
            foreignKeyName: "s3_multipart_uploads_parts_bucket_id_fkey"
            columns: ["bucket_id"]
            referencedRelation: "buckets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "s3_multipart_uploads_parts_upload_id_fkey"
            columns: ["upload_id"]
            referencedRelation: "s3_multipart_uploads"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      add_prefixes: {
        Args: { _bucket_id: string; _name: string }
        Returns: undefined
      }
      can_insert_object: {
        Args: { owner: string; bucketid: string; name: string; metadata: Json }
        Returns: undefined
      }
      delete_prefix: {
        Args: { _bucket_id: string; _name: string }
        Returns: boolean
      }
      extension: {
        Args: { name: string }
        Returns: string
      }
      filename: {
        Args: { name: string }
        Returns: string
      }
      foldername: {
        Args: { name: string }
        Returns: string[]
      }
      get_level: {
        Args: { name: string }
        Returns: number
      }
      get_prefix: {
        Args: { name: string }
        Returns: string
      }
      get_prefixes: {
        Args: { name: string }
        Returns: string[]
      }
      get_size_by_bucket: {
        Args: Record<PropertyKey, never>
        Returns: {
          size: number
          bucket_id: string
        }[]
      }
      list_multipart_uploads_with_delimiter: {
        Args: {
          next_key_token?: string
          next_upload_token?: string
          max_keys?: number
          delimiter_param: string
          prefix_param: string
          bucket_id: string
        }
        Returns: {
          key: string
          id: string
          created_at: string
        }[]
      }
      list_objects_with_delimiter: {
        Args: {
          next_token?: string
          bucket_id: string
          prefix_param: string
          delimiter_param: string
          max_keys?: number
          start_after?: string
        }
        Returns: {
          name: string
          updated_at: string
          metadata: Json
          id: string
        }[]
      }
      operation: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      search: {
        Args: {
          bucketname: string
          prefix: string
          sortorder?: string
          sortcolumn?: string
          offsets?: number
          search?: string
          levels?: number
          limits?: number
        }
        Returns: {
          updated_at: string
          created_at: string
          last_accessed_at: string
          metadata: Json
          id: string
          name: string
        }[]
      }
      search_legacy_v1: {
        Args: {
          levels?: number
          offsets?: number
          search?: string
          sortcolumn?: string
          sortorder?: string
          limits?: number
          bucketname: string
          prefix: string
        }
        Returns: {
          name: string
          id: string
          updated_at: string
          created_at: string
          last_accessed_at: string
          metadata: Json
        }[]
      }
      search_v1_optimised: {
        Args: {
          sortorder?: string
          sortcolumn?: string
          search?: string
          offsets?: number
          levels?: number
          limits?: number
          bucketname: string
          prefix: string
        }
        Returns: {
          metadata: Json
          last_accessed_at: string
          created_at: string
          updated_at: string
          id: string
          name: string
        }[]
      }
      search_v2: {
        Args: {
          levels?: number
          prefix: string
          bucket_name: string
          limits?: number
          start_after?: string
        }
        Returns: {
          key: string
          name: string
          id: string
          updated_at: string
          created_at: string
          metadata: Json
        }[]
      }
    }
    Enums: {
      buckettype: "STANDARD" | "ANALYTICS"
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
  pgbouncer: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
  storage: {
    Enums: {
      buckettype: ["STANDARD", "ANALYTICS"],
    },
  },
} as const
