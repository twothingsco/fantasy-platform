-- Start Transaction for atomicity (recommended for large schema changes)
BEGIN;

-- 1. DROP EXISTING CONSTRAINTS AND FOREIGN KEYS
-- Drop constraints first, then foreign key references.
ALTER TABLE game_week_matchups
    DROP CONSTRAINT unique_gameweek_home_away_team,
    DROP CONSTRAINT check_different_teams,
    DROP CONSTRAINT game_week_matchups_home_game_week_team_id_fkey,
    DROP CONSTRAINT game_week_matchups_away_game_week_team_id_fkey;

-- 2. DROP OLD INDEXES
-- These indexes on single columns must be dropped and replaced by a GIN index.
DROP INDEX index_game_week_matchups_on_home_game_week_team_id;
DROP INDEX index_game_week_matchups_on_away_game_week_team_id;

-- 3. RENAME OLD COLUMNS
-- Rename the old columns to temporary names to retain data during the transition.
ALTER TABLE game_week_matchups
    -- RENAME COLUMN home_game_week_team_id TO _old_home_game_week_team_id
    RENAME COLUMN away_game_week_team_id TO _old_away_game_week_team_id;

-- 4. ADD NEW ARRAY COLUMNS
ALTER TABLE game_week_matchups
    ADD COLUMN home_game_week_team_ids INTEGER[] NOT NULL DEFAULT '{}',
    ADD COLUMN away_game_week_team_ids INTEGER[] NOT NULL DEFAULT '{}';

-- 5. MIGRATE DATA (Convert single ID to single-element array)
UPDATE game_week_matchups
SET
    home_game_week_team_ids = ARRAY[_old_home_game_week_team_id],
    away_game_week_team_ids = ARRAY[_old_away_game_week_team_id];

-- 6. CLEANUP OLD COLUMNS
ALTER TABLE game_week_matchups
    DROP COLUMN _old_home_game_week_team_id,
    DROP COLUMN _old_away_game_week_team_id;

-- 7. ADD NEW CONSTRAINTS AND INDEXES
-- Add the constraint to prevent team overlap in the arrays
ALTER TABLE game_week_matchups
    ADD CONSTRAINT check_no_team_overlap CHECK (NOT home_game_week_team_ids && away_game_week_team_ids);

-- Add the new GIN index for efficient array search operations
CREATE INDEX idx_game_week_matchups_team_ids_gin ON game_week_matchups USING GIN (home_game_week_team_ids, away_game_week_team_ids);

-- Commit the transaction to apply all changes
COMMIT;