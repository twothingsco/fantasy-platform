--setup default leauge 
INSERT INTO fantasy.leagues (
    name
) VALUES (
    'Default League'
);

-- Setting up default league settings 
INSERT INTO fantasy.league_settings (
    league_id,
    total_roster_size,
    starting_lineup_size,
    bench_size,
    starting_position_requirements,
    mode_id,
    draft_type,
    draft_order_reversed_after_round,
    picks_per_round,
    draft_start_date,
    draft_end_date,
    waiver_type,
    faab_budget,
    waiver_run_day,
    waiver_run_time,
    allow_trades,
    trade_deadline,
    trade_review_period_hours,
    playoff_start_week,
    num_playoff_teams,
    championship_week,
    league_status
) VALUES (
    1, -- Assuming league_id for "Default League" is 1
    16, -- Total roster size (e.g., 9 starters + 7 bench)
    9,  -- Starting lineup size (QB, 2RB, 2WR, 1TE, 1FLEX, 1K, 1D/ST)
    7,  -- Bench size
    '{"QB": 1, "RB": 2, "WR": 2, "TE": 1, "FLEX": 1, "K": 1, "DEF": 1}'::jsonb, -- Common ESPN default
    (SELECT id FROM fantasy.modes WHERE name = 'ESPN'), -- Dynamically get mode_id
    'Snake', -- Default draft type
    TRUE,    -- Snake draft order reversed after round
    1,       -- 1 pick per round
    NULL,    -- Draft start date (set later when league is active)
    NULL,    -- Draft end date (set later when league is active)
    'FAAB',  -- Waiver type (ESPN uses FAAB by default sometimes, or Waiver Order)
    100,     -- FAAB budget
    'Wednesday', -- Common waiver run day
    '03:00:00-07', -- 3 AM Pacific Time (adjust to your league's timezone preference)
    TRUE,    -- Allow trades
    NULL,    -- Trade deadline (set closer to season)
    24,      -- Trade review period (24 hours common)
    15,      -- Playoff start week (e.g., NFL Week 15)
    6,       -- Number of playoff teams (e.g., 6)
    17,      -- Championship week (e.g., NFL Week 17)
    'Pre-Draft' -- Initial league status
) ON CONFLICT (league_id) DO UPDATE SET
    total_roster_size = EXCLUDED.total_roster_size,
    starting_lineup_size = EXCLUDED.starting_lineup_size,
    bench_size = EXCLUDED.bench_size,
    starting_position_requirements = EXCLUDED.starting_position_requirements,
    mode_id = EXCLUDED.mode_id,
    draft_type = EXCLUDED.draft_type,
    draft_order_reversed_after_round = EXCLUDED.draft_order_reversed_after_round,
    picks_per_round = EXCLUDED.picks_per_round,
    draft_start_date = EXCLUDED.draft_start_date,
    draft_end_date = EXCLUDED.draft_end_date,
    waiver_type = EXCLUDED.waiver_type,
    faab_budget = EXCLUDED.faab_budget,
    waiver_run_day = EXCLUDED.waiver_run_day,
    waiver_run_time = EXCLUDED.waiver_run_time,
    allow_trades = EXCLUDED.allow_trades,
    trade_deadline = EXCLUDED.trade_deadline,
    trade_review_period_hours = EXCLUDED.trade_review_period_hours,
    playoff_start_week = EXCLUDED.playoff_start_week,
    num_playoff_teams = EXCLUDED.num_playoff_teams,
    championship_week = EXCLUDED.championship_week,
    league_status = EXCLUDED.league_status,
    updated_at = NOW(); -- Ensure updated_at is updated on conflict



-- Seed last season game weeks
    INSERT INTO fantasy.game_weeks (number, season_year) VALUES
(1, 2024),
(2, 2024),
(3, 2024),
(4, 2024),
(5, 2024),
(6, 2024),
(7, 2024),
(8, 2024),
(9, 2024),
(10, 2024);

--Seed 2025 season
    INSERT INTO fantasy.game_weeks (number, season_year) VALUES
(1, 2025),
(2, 2025),
(3, 2025),
(4, 2025),
(5, 2025),
(6, 2025),
(7, 2025),
(8, 2025),
(9, 2025),
(10, 2025);
