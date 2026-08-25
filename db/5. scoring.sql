    --
-- CORE Scoring Function
drop FUNCTION IF EXISTS calculate_player_score;
CREATE OR REPLACE FUNCTION calculate_player_score(
    p_nfl_player_id BIGINT,
    p_game_week_id BIGINT,
    p_mode_id BIGINT
)
RETURNS NUMERIC AS $$
DECLARE
    v_fantasy_score NUMERIC(8,2) := 0.00;
BEGIN
    SELECT
        ROUND((
            (COALESCE(mp.passing_yards, 0) * m.passing_yards_multiplier) +
            (COALESCE(mp.passing_tds, 0) * m.passing_tds_multiplier) +
            (COALESCE(mp.interceptions_thrown, 0) * m.interceptions_thrown_multiplier) +
            (COALESCE(mp.rushing_yards, 0) * m.rushing_yards_multiplier) +
            (COALESCE(mp.rushing_tds, 0) * m.rushing_tds_multiplier) +
            (COALESCE(mp.receiving_receptions, 0) * m.receptions_multiplier) +
            (COALESCE(mp.receiving_yards, 0) * m.receiving_yards_multiplier) +
            (COALESCE(mp.receiving_tds, 0) * m.receiving_tds_multiplier) +
            ((COALESCE(mp.passing_twoptm, 0) + COALESCE(mp.rushing_twoptm, 0) + COALESCE(mp.receiving_twoptm, 0)) * m.two_pt_conversion_multiplier) +
            (COALESCE(mp.fumbles_lost, 0) * m.fumbles_lost_multiplier) +
            (COALESCE(mp.times_sacked, 0) * m.times_sacked_multiplier) +
            (COALESCE(mp.pat_made, 0) * m.extra_points_kicked_multiplier) +
            (COALESCE(mp.pat_missed, 0) * m.extra_points_missed_multiplier) +
            (COALESCE(mp.fg_made_0_19, 0) * m.fg_made_0_19_multiplier) +
            (COALESCE(mp.fg_made_20_29, 0) * m.fg_made_20_29_multiplier) +
            (COALESCE(mp.fg_made_30_39, 0) * m.fg_made_30_39_multiplier) +
            (COALESCE(mp.fg_made_40_49, 0) * m.fg_made_40_49_multiplier) +
            (COALESCE(mp.fg_made_50_plus, 0) * m.fg_made_50_plus_multiplier) +
            (COALESCE(mp.tackles_total, 0) * m.tackles_total_multiplier) +
            (COALESCE(mp.tackles_assisted, 0) * m.tackles_assisted_multiplier) +
            (COALESCE(mp.sacks_made, 0.00) * m.sacks_made_multiplier) +
            (COALESCE(mp.tackles_for_loss, 0) * m.tackles_for_loss_multiplier) +
            (COALESCE(mp.forced_fumbles, 0) * m.forced_fumbles_multiplier) +
            (COALESCE(mp.fumbles_won, 0) * m.fumbles_won_multiplier) +
            (COALESCE(mp.interceptions_caught, 0) * m.interceptions_caught_multiplier) +
            (COALESCE(mp.safeties, 0) * m.safeties_multiplier) +
            (COALESCE(mp.defensive_two_pt_returns, 0) * m.defensive_two_pt_returns_multiplier) +
            (COALESCE(mp.blocked_kicks, 0) * m.blocked_kicks_multiplier) +
            (COALESCE(mp.passes_defended, 0) * m.passes_defended_multiplier) +
            (COALESCE(mp.qb_hits, 0) * m.qb_hits_multiplier) +
            (COALESCE(mp.interception_return_yards, 0) * m.interception_return_yards_multiplier) +
            (COALESCE(mp.fumble_return_yards, 0) * m.fumble_return_yards_multiplier) +
            (COALESCE(mp.defense_touchdowns, 0) * m.defense_touchdowns_multiplier)
        )::NUMERIC, 2)
    INTO v_fantasy_score
    FROM match_players AS mp
    JOIN mods AS m ON m.id = p_mode_id
    WHERE mp.nfl_player_id = p_nfl_player_id AND mp.game_week_id = p_game_week_id;
    
    RETURN COALESCE(v_fantasy_score, 0.00);
END;
$$ LANGUAGE plpgsql;
--


-- Function to get individual player fantasy scores (p_game_week_number, p_season_year, p_mode_name)
-- This function remains unchanged as it's a fundamental building block for scoring players based on a given mode.
DROP FUNCTION IF EXISTS get_player_fantasy_scores;
CREATE OR REPLACE FUNCTION get_player_fantasy_scores(
    p_game_week_number INTEGER,
    p_season_year INTEGER,
    p_mode_name VARCHAR(255)
)
RETURNS TABLE (
    player_id BIGINT,
    player_name VARCHAR,
    nfl_team_name VARCHAR,
    position_type VARCHAR,
    game_week_id_internal INTEGER,
    scoring_mode VARCHAR,
    fantasy_score NUMERIC
) AS $$
DECLARE
    v_game_week_id INTEGER;
BEGIN
    -- Look up the internal game_week_id based on number and season_year
    SELECT id INTO v_game_week_id
    FROM game_weeks as game_weeks
    WHERE game_weeks.number = p_game_week_number AND game_weeks.season_year = p_season_year;

    -- Handle case where game week is not found
    IF v_game_week_id IS NULL THEN
        RAISE EXCEPTION 'Game week (number: %, season: %) not found.', p_game_week_number, p_season_year;
    END IF;

    RETURN QUERY
    SELECT
        np.id AS player_id,
        np.name AS player_name,
        nt.name AS nfl_team_name,
        np.position_type,
        mp.game_week_id AS game_week_id_internal,
        m.name AS scoring_mode,
        calculate_player_score(np.id,v_game_week_id, m.id) AS fantasy_score
    FROM
        match_players AS mp
    JOIN
        nfl_players AS np ON mp.nfl_player_id = np.id
    JOIN
        nfl_teams AS nt ON np.nfl_team_id = nt.id
    JOIN
        mods AS m ON m.name = p_mode_name
    WHERE
        mp.game_week_id = v_game_week_id;
END;
$$ LANGUAGE plpgsql;
---

-- Function to get individual player fantasy scores for a given league based on weekly matchups
DROP FUNCTION IF EXISTS get_individual_player_fantasy_scores;
CREATE OR REPLACE FUNCTION get_individual_player_fantasy_scores(
    p_game_week_number INTEGER,
    p_season_year INTEGER,
    p_league_id INTEGER
)
RETURNS TABLE (
    game_week_number INTEGER,
    season_year INTEGER,
    user_name VARCHAR,
    user_fantasy_team_name VARCHAR,
    user_logo_url VARCHAR,
    game_week_match_id BIGINT,
    game_week_team_id BIGINT,
    player_id BIGINT,
    player_name VARCHAR,
    player_first_name VARCHAR,
    player_last_name VARCHAR,
    player_logo_url VARCHAR,
    nfl_team_name VARCHAR,
    nfl_team_abbreviation VARCHAR,
    position_type VARCHAR,
    roster_slot VARCHAR,
    fantasy_score NUMERIC,
    scoring_mode VARCHAR
)
AS $$
DECLARE
    v_game_week_id BIGINT;
    v_mode_assignment_id BIGINT;
BEGIN
    -- Look up the internal game_week_id based on number and season_year
    SELECT gw.id INTO v_game_week_id
    FROM game_weeks as gw
    WHERE gw.number = p_game_week_number AND gw.season_year = p_season_year;

    -- Handle case where game week is not found
    IF v_game_week_id IS NULL THEN
        RAISE EXCEPTION 'Game week (number: %, season: %) not found.', p_game_week_number, p_season_year;
    END IF;

    RETURN QUERY
    WITH player_mode_assignments AS (
        SELECT
            gwm.id as game_week_match_id,
            gmt.id AS game_week_team_id,
            COALESCE(gwtp.roster_slot,'BEN') AS roster_slot,
            gwtp.nfl_player_id AS nfl_player_id,
            -- Core logic for cascading mode assignment ID retrieval
            COALESCE(
                gwtp.mod_assignment_id, -- 5. Player-specific mode ID (Most Specific Override)
                (gwm.mod_assignments -> gwtp.roster_slot ->> 0)::BIGINT, -- 4a. Matchup-specific Roster Slot mode ID
                (gwm.mod_assignments -> 'ALL' ->> 0)::BIGINT, -- 4b. Matchup-specific 'ALL' mode ID
                (gmt.mod_assignments -> gwtp.roster_slot ->> 0)::BIGINT, -- 3a. Team at Week-specific Roster Slot mode ID
                (gmt.mod_assignments -> 'ALL' ->> 0)::BIGINT, -- 3b. TEam at Week-specific 'ALL' mode ID
                (gw.mod_assignments -> gwtp.roster_slot ->> 0)::BIGINT, -- 2a. Week-specific Roster Slot mode ID
                (gw.mod_assignments -> 'ALL' ->> 0)::BIGINT, -- 2b. Week-specific 'ALL' mode ID
                (l.mod_assignments -> gwtp.roster_slot ->> 0)::BIGINT, -- 1a. League-default Roster Slot mode ID
                (l.mod_assignments -> 'ALL' ->> 0)::BIGINT -- 1b. League-default 'ALL' mode ID (Least Specific Default)
            ) AS effective_mode_id

        FROM
            game_week_matchups AS gwm
            JOIN LATERAL (
                -- Combine the HOME and AWAY arrays using '||' and unnest them into individual rows
                SELECT unnest(gwm.home_game_week_team_ids || gwm.away_game_week_team_ids) AS game_week_team_id
            ) AS unnested_teams ON TRUE

            -- 2. Join game_week_teams (gmt) on the unnested ID.
            JOIN
                game_week_teams AS gmt ON unnested_teams.game_week_team_id = gmt.id

            LEFT JOIN -- Now LEFT JOIN gwtp to the result of the RIGHT JOIN
                game_week_team_players AS gwtp 
                    ON gmt.id = gwtp.game_week_team_id  -- AND ur.nfl_player_id = gwtp.nfl_player_id
            LEFT JOIN -- Now LEFT JOIN the rest of the original tables 
                game_week_leagues AS gw ON gmt.game_week_id = gw.game_week_id AND gmt.league_id = gw.league_id
            JOIN -- This join should still be an INNER JOIN since it's required for mod_assignments
                league_settings AS l ON gmt.league_id = l.league_id 
        WHERE
            gmt.game_week_id = v_game_week_id
            AND gmt.league_id = p_league_id
    )
    SELECT
        p_game_week_number AS game_week_number,
        p_season_year AS season_year,
        u.name AS user_name,
        u.team_name AS user_fantasy_team_name,
        u.logo_url,
        pma.game_week_match_id,
        pma.game_week_team_id,
        p.id as player_id,
        p.name as player_name,
        p.firstname as player_first_name,
        p.lastname as player_last_name,
        p.logo_url as player_logo_url,
        t.name as nfl_team_name,
        t.abbreviation as nfl_team_abbreviation,
        p.position_type as position_type,
        pma.roster_slot as roster_slot,
        -- Use the calculated effective_mode_id in the scoring function
        calculate_player_score(p.id, v_game_week_id, pma.effective_mode_id) AS fantasy_score,
        mod.name AS scoring_mode
    FROM
        player_mode_assignments AS pma
    JOIN
        game_week_teams AS gmt ON pma.game_week_team_id = gmt.id
    JOIN
        users AS u ON gmt.user_id = u.user_id
    JOIN
        nfl_players AS p ON pma.nfl_player_id = p.id
    JOIN
        nfl_teams AS t ON p.nfl_team_id = t.id 
    LEFT JOIN
        mods AS mod ON mod.id = pma.effective_mode_id -- Join to get the mode name
    ORDER BY
        pma.game_week_match_id ASC,
        user_fantasy_team_name ASC,
        CASE p.position_type
            WHEN 'QB' THEN 1
            WHEN 'RB' THEN 2
            WHEN 'WR' THEN 3
            WHEN 'TE' THEN 4
            WHEN 'K' THEN 5
            WHEN 'DEF' THEN 6
            WHEN 'FLEX' THEN 7
            ELSE 8
        END ASC,
        fantasy_score DESC;
END;
$$ LANGUAGE plpgsql;
----

-- gets the total score of all players for a given week, season and league.
DROP FUNCTION IF EXISTS get_team_fantasy_scores;
CREATE OR REPLACE FUNCTION get_team_fantasy_scores(
    p_game_week_number INTEGER,
    p_season_year INTEGER,
    p_league_id INTEGER
)
RETURNS TABLE (
    game_week_number INTEGER,
    season_year INTEGER,
    game_week_team_id BIGINT,
    user_name VARCHAR,
    user_team_name VARCHAR,
    user_logo_url VARCHAR,
    total_team_fantasy_score NUMERIC
) AS $$

BEGIN
    RETURN QUERY
    SELECT
        scores.game_week_number, 
        scores.season_year,
        scores.game_week_team_id,
        scores.user_name,
        scores.user_fantasy_team_name,
        scores.user_logo_url,
        SUM(scores.fantasy_score)::NUMERIC AS total_team_fantasy_score
    FROM
        get_individual_player_fantasy_scores(p_game_week_number, p_season_year, p_league_id) AS scores
    WHERE 
        scores.roster_slot NOT IN ('BEN', 'IR')
    GROUP BY
        scores.game_week_number, 
        scores.season_year,
        scores.game_week_team_id,
        scores.user_name,
        scores.user_logo_url,
        scores.user_fantasy_team_name
    ORDER BY
        total_team_fantasy_score DESC;
END;
$$ LANGUAGE plpgsql;
----

-- gets the total score of all players for a given week, season and league.
DROP FUNCTION IF EXISTS get_team_fantasy_scores;
CREATE OR REPLACE FUNCTION get_team_fantasy_scores(
    p_game_week_number INTEGER,
    p_season_year INTEGER,
    p_league_id INTEGER
)
RETURNS TABLE (
    game_week_number INTEGER,
    season_year INTEGER,
    game_week_team_id BIGINT,
    user_name VARCHAR,
    user_team_name VARCHAR,
    total_team_fantasy_score NUMERIC
) AS $$

BEGIN
    RETURN QUERY
    SELECT
        scores.game_week_number, 
        scores.season_year,
        scores.game_week_team_id,
        scores.user_name,
        scores.user_fantasy_team_name,
        SUM(scores.fantasy_score)::NUMERIC AS total_team_fantasy_score
    FROM
        get_individual_player_fantasy_scores(p_game_week_number, p_season_year, p_league_id) AS scores
    WHERE 
        scores.roster_slot != 'BEN'
    GROUP BY
        scores.game_week_number, 
        scores.season_year,
        scores.game_week_team_id,
        scores.user_name,
        scores.user_fantasy_team_name
    ORDER BY
        total_team_fantasy_score DESC;
END;
$$ LANGUAGE plpgsql;
----
---
--
-- Helper function to get non zero scores 
--
DROP FUNCTION IF EXISTS get_draft_pool;
CREATE OR REPLACE FUNCTION get_draft_pool(
    p_game_week_number INTEGER,
    p_season_year INTEGER,
    p_mode_name VARCHAR(255)
)
RETURNS TABLE (
    player_id BIGINT,
    player_name VARCHAR,
    nfl_team_name VARCHAR,
    position_type VARCHAR,
    game_week_id_internal INTEGER,
    scoring_mode VARCHAR,
    fantasy_score NUMERIC
) AS $$
DECLARE
    v_game_week_id INTEGER;
BEGIN
    -- Look up the internal game_week_id based on number and season_year
    SELECT id INTO v_game_week_id
    FROM game_weeks as game_weeks
    WHERE game_weeks.number = p_game_week_number AND game_weeks.season_year = p_season_year;

    -- Handle case where game week is not found
    IF v_game_week_id IS NULL THEN
        RAISE EXCEPTION 'Game week (number: %, season: %) not found.', p_game_week_number, p_season_year;
    END IF;

    RETURN QUERY
SELECT 
    gpfs.player_id as player_id,
    gpfs.player_name as player_name,
    gpfs.nfl_team_name as nfl_team_name,
    gpfs.position_type as position_type,
    gpfs.game_week_id_internal as game_week_id,
    gpfs.scoring_mode as scoring_mode,
    gpfs.fantasy_score as fantasy_score
FROM
    get_player_fantasy_scores(p_game_week_number, p_season_year, p_mode_name) as gpfs
WHERE 
    gpfs.fantasy_score > 0
 ORDER BY
    gpfs.fantasy_score DESC;
END;
$$ LANGUAGE plpgsql;
---
---
--- Helper function to get the league schedule 
DROP FUNCTION IF EXISTS get_league_schedule;
CREATE OR REPLACE FUNCTION get_league_schedule(
    p_season_year INTEGER,
    p_league_id INTEGER
) 
RETURNS TABLE (
    match_id BIGINT,
    season_year INTEGER,
    game_week_number INTEGER,
    home_team_ids INTEGER[],
    home_team_names VARCHAR[],
    away_team_ids INTEGER[],
    away_team_names VARCHAR[],
    home_team_score NUMERIC,
    away_team_score NUMERIC,
    league_id INTEGER
) AS $$
BEGIN
RETURN QUERY
SELECT
    gwm.id as match_id,
    gw.season_year,
    gw.number AS game_week_number,
    home_agg.team_ids::INTEGER[] AS home_team_ids,
    home_agg.team_names AS home_team_names,
    away_agg.team_ids::INTEGER[] AS away_team_ids,
    away_agg.team_names AS away_team_names,
    gwm.home_team_score,
    gwm.away_team_score,
    p_league_id::INTEGER AS league_id
FROM
    game_week_matchups AS gwm
JOIN
    game_weeks AS gw ON gw.id = gwm.game_week_id

-- 1. LATERAL JOIN for HOME team details
-- CHANGED to LEFT JOIN LATERAL to ensure the main row is kept
LEFT JOIN LATERAL ( 
    SELECT
        -- FIX: Use COALESCE to return empty array '{}' instead of NULL if no teams match league_id
        COALESCE(ARRAY_AGG(home_user.id), '{}'::INTEGER[]) AS team_ids,
        COALESCE(ARRAY_AGG(home_user.team_name::VARCHAR), '{}'::VARCHAR[]) AS team_names 
    FROM
        unnest(gwm.home_game_week_team_ids) AS home_team_id
    JOIN
        game_week_teams AS home_gwt ON home_team_id = home_gwt.id
    JOIN
        users AS home_user ON home_gwt.user_id = home_user.user_id
    WHERE home_gwt.league_id = p_league_id -- Use parameter
) AS home_agg ON TRUE

-- 2. LATERAL JOIN for AWAY team details
-- CHANGED to LEFT JOIN LATERAL to ensure the main row is kept
LEFT JOIN LATERAL (
    SELECT
        -- FIX: Use COALESCE to return empty array '{}' instead of NULL if no teams match league_id
        COALESCE(ARRAY_AGG(away_user.id), '{}'::INTEGER[]) AS team_ids,
        COALESCE(ARRAY_AGG(away_user.team_name::VARCHAR), '{}'::VARCHAR[]) AS team_names 
    FROM
        unnest(gwm.away_game_week_team_ids) AS away_team_id
    JOIN
        game_week_teams AS away_gwt ON away_team_id = away_gwt.id
    JOIN
        users AS away_user ON away_gwt.user_id = away_user.user_id
    WHERE away_gwt.league_id = p_league_id -- Use parameter
) AS away_agg ON TRUE

WHERE
    gw.season_year = p_season_year
    -- NEW FILTER: Ensure at least one side successfully aggregated a team from p_league_id
    AND (home_agg.team_ids <> '{}' OR away_agg.team_ids <> '{}')
ORDER BY
    gw.season_year, gw.number, gwm.id;
END;
$$ LANGUAGE plpgsql;


---
DROP FUNCTION IF EXISTS get_team_roster_with_scores;
CREATE OR REPLACE FUNCTION get_team_roster_with_scores(
    p_game_week_number INTEGER,
    p_season_year INTEGER,
    p_league_id INTEGER
)
RETURNS TABLE (
    game_week_number INTEGER,
    season_year INTEGER,
    user_name VARCHAR,
    user_fantasy_team_name VARCHAR,
    player_name VARCHAR,
    nfl_team_name VARCHAR,
    position_type VARCHAR,
    fantasy_score NUMERIC
) AS $$
DECLARE
    v_mode_name VARCHAR(255); -- Declare variable for mode name
BEGIN
   
    -- Retrieve the scoring mode name from league_settings
    SELECT m.name INTO v_mode_name
    FROM league_settings AS ls
    JOIN modes AS m ON ls.mode_id = m.id
    WHERE ls.league_id = p_league_id;

    -- Handle case where league settings or mode are not found
    IF v_mode_name IS NULL THEN
        RAISE EXCEPTION 'Scoring mode not found for league ID %.', p_league_id;
    END IF;

RETURN QUERY

SELECT
        p_game_week_number AS game_week_number,
        p_season_year AS season_year,
        u.name AS user_name,
        u.team_name AS user_fantasy_team_name,
        gfs.player_name,
        gfs.nfl_team_name,
        gfs.position_type,
        gfs.fantasy_score
    FROM
        user_roster AS ur
    JOIN
        users AS u ON ur.user_id = u.user_id
    JOIN 
        user_leagues as ul ON ul.user_id = ur.user_id
    JOIN
        get_player_fantasy_scores(p_game_week_number, p_season_year, v_mode_name) AS gfs -- Pass the retrieved mode name
        ON ur.nfl_player_id = gfs.player_id 
    WHERE
        ul.league_id = p_league_id
    ORDER BY
        user_fantasy_team_name ASC,
        gfs.fantasy_score DESC;
END;
$$ LANGUAGE plpgsql;

----


----
-- Function to create user roster from completed draft picks for a given league and season.
-- This procedure will only run if all draft picks for the specified league and season have a 'complete' status.
DROP FUNCTION IF EXISTS create_user_roster_from_draft;
CREATE OR REPLACE FUNCTION create_user_roster_from_draft(
    p_league_id BIGINT,
    p_season_year INTEGER
)
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
    v_draft_complete BOOLEAN;
    v_inserted_count INTEGER;
BEGIN
    -- Check if all draft picks for the specified league and season are marked as 'complete'.
    SELECT NOT EXISTS (
        SELECT 1
        FROM draft_picks
        WHERE 
            league_id = p_league_id AND 
            season_year = p_season_year AND 
            status != 'complete'
    ) INTO v_draft_complete;

    -- If the draft is complete, proceed with populating the user_roster table.
    IF v_draft_complete THEN
        -- Insert a new row into user_roster for each completed draft pick.
        -- This uses a JOIN to get the team_name from the users table.
        -- The ON CONFLICT clause prevents duplicate entries if the function is run more than once.
        INSERT INTO user_roster (
            user_id,
            nfl_player_id,
            team_name,
            season_year
        )
        SELECT
            dp.user_id,
            dp.nfl_player_id,
            u.team_name,
            dp.season_year
        FROM
            draft_picks AS dp
        INNER JOIN
            users AS u ON dp.user_id = u.user_id
        WHERE
            dp.league_id = p_league_id AND
            dp.season_year = p_season_year AND
            dp.status = 'complete'
        ON CONFLICT DO NOTHING;
        
        -- Get the number of rows affected by the previous INSERT statement
        GET DIAGNOSTICS v_inserted_count = ROW_COUNT;

        -- Return a success message with the number of players added to the roster.
        RETURN 'Rosters for League ' || p_league_id || ' for the ' || p_season_year || ' season have been successfully created. ' || v_inserted_count || ' players were added.';
    ELSE
        -- Return a message indicating that the draft is not yet complete.
        RETURN 'Draft for League ' || p_league_id || ' for the ' || p_season_year || ' season is not yet complete. Roster creation aborted.';
    END IF;
END;
$$;

-----

---
-- Function to get the available draft pool for a specific league, game week, season, and scoring mode.
-- This function excludes all players that have already been selected in the draft for the given league and season.
DROP FUNCTION IF EXISTS get_available_draft_pool;
CREATE OR REPLACE FUNCTION get_available_draft_pool(
    p_league_id BIGINT,
    p_game_week_number INTEGER,
    p_season_year INTEGER,
    p_mode_name VARCHAR(255)
)
RETURNS TABLE (
    player_id BIGINT,
    player_name VARCHAR,
    nfl_team_name VARCHAR,
    position_type VARCHAR,
    game_week_id_internal INTEGER,
    scoring_mode VARCHAR,
    fantasy_score NUMERIC
) AS $$
DECLARE
    v_game_week_id INTEGER;
BEGIN
    -- Look up the internal game_week_id based on number and season_year
    SELECT id INTO v_game_week_id
    FROM game_weeks as game_weeks
    WHERE game_weeks.number = 1 AND game_weeks.season_year = p_season_year;

    -- Handle case where game week is not found
    IF v_game_week_id IS NULL THEN
        RAISE EXCEPTION 'Game week (number: %, season: %) not found.', p_game_week_number, p_season_year;
    END IF;

    -- Use a CTE (Common Table Expression) to get all drafted player IDs for the specified league and season.
    -- This makes the main query cleaner and more efficient.
    RETURN QUERY
    WITH drafted_players AS (
        SELECT nfl_player_id
        FROM draft_picks
        WHERE league_id = p_league_id AND season_year = p_season_year
        AND nfl_player_id IS NOT NULL
    )
    -- Select the player fantasy scores from the original draft pool
    SELECT 
        gpfs.player_id as player_id,
        gpfs.player_name as player_name,
        gpfs.nfl_team_name as nfl_team_name,
        gpfs.position_type as position_type,
        gpfs.game_week_id_internal as game_week_id,
        gpfs.scoring_mode as scoring_mode,
        gpfs.fantasy_score as fantasy_score
    FROM
        get_player_fantasy_scores(1, p_season_year, p_mode_name) as gpfs
    -- Filter out players that are in the drafted_players CTE
    WHERE 
        gpfs.fantasy_score > 0
        AND gpfs.player_id NOT IN (SELECT nfl_player_id FROM drafted_players)
    ORDER BY
        gpfs.fantasy_score DESC;
END;
$$ LANGUAGE plpgsql;

---
---
-- Function to pre-populate the draft_picks table for a snake draft.
-- This function now retrieves the total rounds from league settings and the draft order from user_leagues.
DROP FUNCTION IF EXISTS populate_snake_draft;
CREATE OR REPLACE FUNCTION populate_snake_draft(
    p_league_id BIGINT,
    p_season_year INTEGER
)
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
    v_pick_number INTEGER := 1;
    v_total_rounds INTEGER;
    v_draft_order_user_ids BIGINT[];
    v_current_round_order BIGINT[];
    v_user_id BIGINT;
    v_round INTEGER;
BEGIN
    -- Get total rounds from league_settings. Total rounds is equal to total_roster_size per team.
    SELECT total_roster_size INTO v_total_rounds
    FROM league_settings
    WHERE league_id = p_league_id;

    -- Get the user IDs for the league, ordered by their join date (or another appropriate default order).
    -- We are assuming the first teams to join have the first draft picks. You may want to change this ordering later.
    SELECT array_agg(user_id ORDER BY joined_at ASC) INTO v_draft_order_user_ids
    FROM user_leagues
    WHERE league_id = p_league_id;

    -- Input validation
    IF v_total_rounds IS NULL OR v_total_rounds <= 0 THEN
        RETURN 'Error: League settings for total roster size not found or invalid.';
    END IF;

    IF v_draft_order_user_ids IS NULL OR array_length(v_draft_order_user_ids, 1) = 0 THEN
        RETURN 'Error: No users found in the league to populate the draft.';
    END IF;

    -- Clear any existing draft picks for this league and season to start fresh.
    DELETE FROM draft_picks
    WHERE league_id = p_league_id AND season_year = p_season_year;

    -- Loop through each round of the draft
    FOR v_round IN 1..v_total_rounds LOOP
        -- Determine the draft order for the current round (snake draft logic)
        IF v_round % 2 = 1 THEN
            -- For odd rounds (1, 3, 5...), the order is straight
            v_current_round_order := v_draft_order_user_ids;
        ELSE
            -- For even rounds (2, 4, 6...), the order is reversed
            -- Corrected syntax: ORDER BY is now inside the array_agg function.
            SELECT array_agg(u ORDER BY u DESC) INTO v_current_round_order
            FROM unnest(v_draft_order_user_ids) AS u;
        END IF;

        -- Loop through the teams in the current round's order and insert the picks
        FOREACH v_user_id IN ARRAY v_current_round_order LOOP
            INSERT INTO draft_picks (
                league_id,
                user_id,
                season_year,
                round_number,
                pick_number,
                status
            )
            VALUES (
                p_league_id,
                v_user_id,
                p_season_year,
                v_round,
                v_pick_number,
                'pending'
            );
            
            -- Increment the overall pick number
            v_pick_number := v_pick_number + 1;
        END LOOP;
    END LOOP;

    RETURN 'Snake draft for League ' || p_league_id || ' for the ' || p_season_year || ' season has been successfully populated.';
EXCEPTION
    WHEN OTHERS THEN
        RETURN 'An error occurred: ' || SQLERRM;
END;
$$;
---
---

-- Function to calculate the leaderboard for a given league, season, and game week.
-- This function aggregates the total wins, losses, and ties for each user based on their matchups.
-- It uses the get_team_fantasy_scores function to get the scores for each team
DROP FUNCTION calculate_leaderboard;
CREATE OR REPLACE FUNCTION calculate_leaderboard(
    p_game_week_number INTEGER,
    p_season_year INTEGER,
    p_league_id INTEGER
)
RETURNS TABLE (
    user_id BIGINT,
    team_name VARCHAR,
    user_team_logo VARCHAR,
    wins INTEGER,
    losses INTEGER,
    ties INTEGER,
    total_team_fantasy_score NUMERIC,
    total_accumulated_fantasy_score NUMERIC
)
LANGUAGE plpgsql
AS $$
DECLARE
    -- Variable to loop through each game week
    current_week INTEGER;
BEGIN
    -- Create a temporary table to store the final leaderboard data.
    CREATE TEMP TABLE IF NOT EXISTS temp_leaderboard (
        user_id BIGINT PRIMARY KEY,
        wins INTEGER DEFAULT 0,
        losses INTEGER DEFAULT 0,
        ties INTEGER DEFAULT 0
    ) ON COMMIT DROP;

    CREATE TEMP TABLE IF NOT EXISTS temp_fantasy_scores (
        user_id BIGINT PRIMARY KEY,
        total_score NUMERIC DEFAULT 0.00
    ) ON COMMIT DROP;

    -- Clear any data from a previous call in the same session.
    TRUNCATE TABLE temp_leaderboard;
    TRUNCATE TABLE temp_fantasy_scores;

    -- Initialize the leaderboard with all users from the specified league.
    INSERT INTO temp_leaderboard (user_id)
    SELECT ul.user_id
    FROM user_leagues AS ul
    WHERE ul.league_id = p_league_id;

    INSERT INTO temp_fantasy_scores (user_id)
    SELECT ul.user_id
    FROM user_leagues AS ul
    WHERE ul.league_id = p_league_id;

    -- Loop through each game week from 1 up to the specified week number.
    FOR current_week IN 1..p_game_week_number LOOP

        UPDATE temp_fantasy_scores AS tfs
        SET total_score = tfs.total_score + weekly_agg.weekly_score
        FROM (
            SELECT
                gwt.user_id,
                -- We assume get_team_fantasy_scores returns a total score per team for the week
                SUM(calTfs.total_team_fantasy_score) AS weekly_score
            FROM
                get_team_fantasy_scores(current_week, p_season_year, p_league_id) as calTfs
            JOIN
                game_week_teams AS gwt ON calTfs.game_week_team_id = gwt.id
            GROUP BY gwt.user_id
        ) AS weekly_agg
        WHERE tfs.user_id = weekly_agg.user_id;

        -- Use CTEs to calculate the outcomes for the current week's matchups.
        WITH weekly_scores AS (
            SELECT
                calTfs.game_week_team_id,
                calTfs.total_team_fantasy_score
            FROM
                get_team_fantasy_scores(current_week, p_season_year, p_league_id) as calTfs
        ),
        weekly_outcomes AS (
            SELECT
                gwm.id AS matchup_id,
                -- User IDs for the paired teams
                gwt_paired_home.user_id AS home_user_id,
                gwt_paired_away.user_id AS away_user_id,
                -- Apply the overall outcome based on the aggregated scores
                CASE
                    WHEN home_agg.total_score > away_agg.total_score THEN 'home_win'
                    WHEN home_agg.total_score < away_agg.total_score THEN 'away_win'
                    ELSE 'tie'
                END AS outcome
            FROM
                game_week_matchups AS gwm
            JOIN
                game_weeks AS gw ON gwm.game_week_id = gw.id

            -- 1. LATERAL JOIN to calculate the total HOME score
            LEFT JOIN LATERAL (
                SELECT
                    COALESCE(SUM(ws.total_team_fantasy_score), 0.00) AS total_score
                FROM
                    unnest(gwm.home_game_week_team_ids) AS home_team_id
                LEFT JOIN
                    weekly_scores AS ws ON home_team_id = ws.game_week_team_id
            ) AS home_agg ON TRUE

            -- 2. LATERAL JOIN to calculate the total AWAY score
            LEFT JOIN LATERAL (
                SELECT
                    COALESCE(SUM(ws.total_team_fantasy_score), 0.00) AS total_score
                FROM
                    unnest(gwm.away_game_week_team_ids) AS away_team_id
                LEFT JOIN
                    weekly_scores AS ws ON away_team_id = ws.game_week_team_id
            ) AS away_agg ON TRUE

            -- 3. LATERAL JOIN to unroll and pair the team IDs for output rows
            JOIN LATERAL (
                SELECT
                    home_team_id,
                    away_team_id
                FROM
                    -- Unroll HOME IDs, giving them a row number (rn)
                    unnest(gwm.home_game_week_team_ids) WITH ORDINALITY AS home_unnest(home_team_id, rn)
                INNER JOIN
                    -- Unroll AWAY IDs, joining on the same row number (rn)
                    unnest(gwm.away_game_week_team_ids) WITH ORDINALITY AS away_unnest(away_team_id, rn) ON home_unnest.rn = away_unnest.rn
            ) AS paired_teams ON TRUE

            -- 4. Get the user ID for the paired home team
            JOIN
                game_week_teams AS gwt_paired_home ON paired_teams.home_team_id = gwt_paired_home.id
            -- 5. Get the user ID for the paired away team
            JOIN
                game_week_teams AS gwt_paired_away ON paired_teams.away_team_id = gwt_paired_away.id
            WHERE
                gw.season_year = p_season_year
                AND gwt_paired_home.league_id = p_league_id
                AND gw.number = current_week
        )
        -- Update the temporary leaderboard table with the results from the current week.
        UPDATE temp_leaderboard AS tl
        SET
            wins = tl.wins + (SELECT COUNT(*) FROM weekly_outcomes WHERE (outcome = 'home_win' AND home_user_id = tl.user_id) OR (outcome = 'away_win' AND away_user_id = tl.user_id)),
            losses = tl.losses + (SELECT COUNT(*) FROM weekly_outcomes WHERE (outcome = 'home_win' AND away_user_id = tl.user_id) OR (outcome = 'away_win' AND home_user_id = tl.user_id)),
            ties = tl.ties + (SELECT COUNT(*) FROM weekly_outcomes WHERE outcome = 'tie' AND (home_user_id = tl.user_id OR away_user_id = tl.user_id))
        FROM (
        SELECT
            combined_outcomes.user_id,
            SUM(CASE WHEN outcome_type = 'win' THEN 1 ELSE 0 END) AS wins,
            SUM(CASE WHEN outcome_type = 'loss' THEN 1 ELSE 0 END) AS losses,
            SUM(CASE WHEN outcome_type = 'tie' THEN 1 ELSE 0 END) AS ties
        FROM (
            SELECT
                home_user_id AS user_id,
                CASE WHEN outcome = 'home_win' THEN 'win' WHEN outcome = 'away_win' THEN 'loss' ELSE 'tie' END AS outcome_type
            FROM weekly_outcomes
            UNION ALL
            SELECT
                away_user_id AS user_id,
                CASE WHEN outcome = 'away_win' THEN 'win' WHEN outcome = 'home_win' THEN 'loss' ELSE 'tie' END AS outcome_type
            FROM weekly_outcomes
        ) AS combined_outcomes
        GROUP BY combined_outcomes.user_id
    ) AS weekly_agg
    WHERE tl.user_id = weekly_agg.user_id;
    END LOOP;

    -- Return the final results from the temporary table.
    RETURN QUERY
    SELECT
        t.user_id,
        u.team_name,
        u.logo_url,
        t.wins,
        t.losses,
        t.ties,
        tfs.total_team_fantasy_score,
        ttfs.total_score
    FROM
        temp_leaderboard AS t
    JOIN
        users AS u ON t.user_id = u.user_id
    JOIN
       game_week_teams gwt ON u.user_id = gwt.user_id
    JOIN 
        get_team_fantasy_scores(p_game_week_number, p_season_year, p_league_id) as tfs on tfs.game_week_team_id = gwt.id
    LEFT JOIN -- Use LEFT JOIN in case a user has no scores for some reason
        temp_fantasy_scores AS ttfs ON t.user_id = ttfs.user_id
    ORDER BY
        t.wins DESC,
        t.losses ASC,
        t.ties DESC;

END;
$$;
----- 


--------
---- MOD FUNCTIONS 
CREATE OR REPLACE FUNCTION update_team_mod_for_week(
    p_week_number INTEGER, 
    p_season_year INTEGER, 
    p_league_id INTEGER,
    p_auth_user_id UUID,
    p_mod_id BIGINT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
    v_user_id BIGINT;
    v_game_week_id BIGINT; -- Variable to hold the retrieved ID
    v_positions positions[];
    v_mod_assignments JSONB := '{}';
    v_position TEXT;
    v_new_mod_entry JSONB;
BEGIN
    -- 1. Get the internal user_id from the auth_user_id
    SELECT ul.user_id INTO v_user_id
    from users as u join user_leagues as ul on u.user_id = ul.user_id 
    where u.auth_user_id = p_auth_user_id
    and ul.league_id = p_league_id;

    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'User with auth_id % not found.', p_auth_user_id;
    END IF;

    -- 2. LOOKUP: Get the game_week_id
    SELECT id INTO v_game_week_id
    FROM game_weeks
    WHERE "number" = p_week_number
      AND season_year = p_season_year;

    IF v_game_week_id IS NULL THEN
        RAISE EXCEPTION 'Game Week % for Season % not found.', p_week_number, p_season_year;
    END IF;

    -- 3. Get the positions_affected from the mods table
    SELECT position_affected INTO v_positions
    FROM mods
    WHERE id = p_mod_id;

    IF v_positions IS NULL THEN
        RAISE EXCEPTION 'Mod with ID % not found.', p_mod_id;
    END IF;

    -- 4. Construct the new mod_assignments JSONB for game_week_teams
    FOREACH v_position IN ARRAY v_positions
    LOOP
        v_mod_assignments := jsonb_set(
            v_mod_assignments,
            ARRAY[v_position],
            jsonb_build_array(p_mod_id),
            TRUE
        );
    END LOOP;

    ---

    -- 5. UPDATE the record in game_week_teams (Mod Assignment)
    -- Uses the LOOKED UP v_game_week_id
    UPDATE game_week_teams
    SET
        mod_assignments = v_mod_assignments
    WHERE
        user_id = v_user_id
        AND league_id = p_league_id
        AND game_week_id = v_game_week_id; -- Use the retrieved ID

    ---

    -- 6. Prepare the new mod entry for user_leagues
    -- Note: We still use p_week_number for the history JSON, not the internal ID
    v_new_mod_entry := jsonb_build_object('week', p_week_number, 'mod', p_mod_id, 'season', p_season_year);

    -- 7. UPDATE the record in user_leagues (Mod History)
    UPDATE user_leagues
    SET
        -- Append the new entry to the existing mods_used array.
        mods_used = COALESCE(mods_used, '[]'::jsonb) || v_new_mod_entry
    WHERE
        user_id = v_user_id
        AND league_id = p_league_id;

END;
$function$;


--- FUNCTION FOR league data
CREATE OR REPLACE FUNCTION get_full_league_data(
    p_season_year INTEGER,
    p_league_id INTEGER
)
RETURNS TABLE (
    -- League Columns (from leagues and league_settings)
    league_id BIGINT,
    league_name VARCHAR,
    commissioner_user_id BIGINT,
    league_options JSONB,
    league_status VARCHAR,
    draft_type VARCHAR,
    waiver_type VARCHAR,
    -- User-League Columns (Aggregated)
    user_ids BIGINT[],
    user_roles TEXT[],
    -- Schedule Columns (from get_league_schedule)
    game_week_number BIGINT,
    schedule_home_user_id BIGINT,
    schedule_away_user_id BIGINT,
    schedule_home_team_name VARCHAR,
    schedule_away_away_team VARCHAR,
    schedule_home_score NUMERIC,
    schedule_away_score NUMERIC
)
LANGUAGE sql
AS $$
SELECT
    l.id AS league_id,
    l.name AS league_name,
    l.commissioner_user_id,
    l.league_options,
    ls.league_status,
    ls.draft_type,
    ls.waiver_type,
    -- Collect all user IDs and roles into arrays for the league
    (SELECT ARRAY_AGG(ul.user_id) FROM user_leagues ul WHERE ul.league_id = l.id) AS user_ids,
    (SELECT ARRAY_AGG(ul.role) FROM user_leagues ul WHERE ul.league_id = l.id) AS user_roles,
    -- Columns from the Schedule function (s)
    s.game_week_number AS game_week_number,
    s.home_user_id AS schedule_home_user_id,
    s.away_user_id AS schedule_away_user_id,
    s.home_team_name AS schedule_home_team_name,
    s.away_team_name AS schedule_away_away_team,
    s.home_team_score AS schedule_home_score,
    s.away_team_score AS schedule_away_score
FROM
    leagues l
JOIN
    league_settings ls ON l.id = ls.league_id
-- Use LATERAL to execute the function for *each* league row
-- We pass the current league ID (l.id) and the function's parameter (p_season_year)
CROSS JOIN LATERAL
    get_league_schedule(p_season_year, p_league_id) s
where l.id = p_league_id
ORDER BY
    l.id, s.game_week_number;
$$;

-----


---- 
---  FUNCTION FOR GETTING A SINGLE LEAGUE SUMMARY
----
CREATE OR REPLACE FUNCTION get_single_league_summary(
    p_league_id INTEGER,
    p_auth_user_id UUID,
    p_season_year INTEGER -- Required for the schedule function
)
RETURNS JSONB
LANGUAGE sql
AS $$
WITH league_user AS (
    -- 1. Get the internal user_id for the authenticated user
    SELECT u.user_id
    FROM users as u JOIN user_leagues as ul ON u.user_id = ul.user_id
    WHERE u.auth_user_id = p_auth_user_id
    AND  ul.league_id = p_league_id
),
league_schedule_data AS (
    -- 2. Get the entire league schedule for the season/league
    -- Assumes get_league_schedule returns a set of rows (a table)
    SELECT *
    FROM get_league_schedule(p_season_year, p_league_id)
)
SELECT
    jsonb_build_object(
        'league_name', l.name,
        'league_id', l.id,
        'commissioner_id', l.commissioner_user_id,
        'league_options' , l.league_options,
        'league_settings', jsonb_build_object(
            'mode_name', m.name,
            'scoring_type', m.scoring_type,
            'available_mods', m.available_mods,
            'mods_per_week', m.mods_per_week,
            'bench_seats', ls.bench_size,
            'championship_week', ls.championship_week,
            'playoff_start_week', ls.playoff_start_week,
            'league_status', ls.league_status,
            'mod_assignments', ls.mod_assignments,
            'broadcast_channel', ls.broadcast_channel,
            'starting_position_requirements', ls.starting_position_requirements
        ),
        'user_team', (
            -- Subquery 3: Get the specific user's role and details
            SELECT 
                jsonb_build_object(
                    'user_id', u.user_id,
                    'name', u.name,
                    'team_name', u.team_name,
                    'auth_user_id', u.auth_user_id,
                    'mods_used', lu.mods_used,
                    'joined_at', lu.joined_at,
                    'role', lu.role
                )
            FROM users u
            JOIN user_leagues lu ON u.user_id = lu.user_id
            JOIN league_user lu_auth ON lu.user_id = lu_auth.user_id
            WHERE lu.league_id = l.id
        ),
        'schedule', (
        -- Subquery 4: Aggregate the results of the league schedule into a JSON array
        SELECT jsonb_agg(
            jsonb_build_object(
                'match_id', sd.match_id,
                'season_year', sd.season_year,
                'game_week_number', sd.game_week_number,
                'home', jsonb_build_object(
                    'user_id', sd.home_user_ids,
                    'name', sd.home_team_names,   -- Assumes this column exists in sd
                    'score', sd.home_team_score
                ),
                'away', jsonb_build_object(
                    'user_id', sd.away_user_ids,
                    'name', sd.away_team_names,   -- Assumes this column exists in sd
                    'score', sd.away_team_score
                )
            )
        )
        FROM league_schedule_data sd
      )
    )
FROM
    leagues l
JOIN
    league_settings ls ON l.id = ls.league_id
JOIN
    modes m ON ls.mode_id = m.id
WHERE
    l.id = p_league_id;
$$;
-----

---
--- INDIVIDUAL PLAYER STATS-
---
drop function get_player_stats_with_fantasy_score
CREATE OR REPLACE FUNCTION get_player_stats_with_fantasy_score(
    p_game_week_number INTEGER,
    p_season_year INTEGER,
    p_league_id INTEGER,
    p_nfl_player_id BIGINT
)
RETURNS TABLE (
    game_week_number INTEGER,
    season_year INTEGER,
    user_name VARCHAR,
    user_fantasy_team_name VARCHAR,
    game_week_match_id BIGINT,
    game_week_team_id BIGINT,
    player_id BIGINT,
    player_name VARCHAR,
    nfl_team_name VARCHAR,
    position_type VARCHAR,
    roster_slot VARCHAR,
    fantasy_score NUMERIC,
    scoring_mode VARCHAR,
    player_stats JSONB
)
LANGUAGE plpgsql
AS $$
DECLARE
    v_game_week_id INTEGER;
BEGIN
    -- Look up the internal game_week_id based on number and season_year
    SELECT id INTO v_game_week_id
    FROM game_weeks as game_weeks
    WHERE game_weeks.number = p_game_week_number AND game_weeks.season_year = p_season_year;
RETURN QUERY
SELECT
    score.game_week_number,
    score.season_year,
    score.user_name,
    score.user_fantasy_team_name,
    score.game_week_match_id,
    score.game_week_team_id,
    score.player_id,
    score.player_name,
    score.nfl_team_name,
    score.position_type,
    score.roster_slot,
    score.fantasy_score,
    score.scoring_mode,
    jsonb_strip_nulls(
        to_jsonb(mp.*) - 'id' - 'game_week_id' - 'nfl_player_id' - 'created_at' - 'updated_at'
    ) AS player_stats_json
FROM
    get_individual_player_fantasy_scores(p_game_week_number, p_season_year, p_league_id) AS score
INNER JOIN
    match_players AS mp ON score.player_id = mp.nfl_player_id AND mp.game_week_id = v_game_week_id
WHERE
    score.player_id = p_nfl_player_id;
END;
$$;

----
----
CREATE OR REPLACE FUNCTION replace_game_week_roster(
    p_game_week_team_id BIGINT,
    p_players_to_insert JSONB
)
RETURNS SETOF game_week_team_players
LANGUAGE plpgsql
AS $$
BEGIN
    -- 1. Delete existing players for the given team ID
    DELETE FROM game_week_team_players
    WHERE game_week_team_id = p_game_week_team_id;

    -- 2. Insert new players from the JSON array
    RETURN QUERY
    INSERT INTO game_week_team_players (game_week_team_id, nfl_player_id, playing, roster_slot)
    SELECT
        p_game_week_team_id,
        (player->>'nflPlayerId')::BIGINT,
        (player->>'playing')::BOOLEAN,
        (player->>'rosterSlot')::TEXT
    FROM jsonb_array_elements(p_players_to_insert) AS player
    RETURNING *;
END;
$$;

----
---- KING OF THE HILL SCORING 
----
drop FUNCTION calculate_and_accumulate_scores;
CREATE OR REPLACE FUNCTION calculate_and_accumulate_scores(
    p_game_week_number INTEGER,
    p_season_year INTEGER,
    p_league_id INTEGER
)
RETURNS TABLE (
    game_week_number INTEGER,
    season_year INTEGER,
    game_week_team_id BIGINT,
    user_name VARCHAR,
    user_team_name VARCHAR,
    user_team_logo VARCHAR,
    original_weekly_score NUMERIC,
    weekly_bonus_score INTEGER,
    aggregated_weekly_score NUMERIC,
    accumulated_total_score NUMERIC
) AS $$
    
    WITH 
    -- 1. EFFICIENT DATA RETRIEVAL: Call get_team_fantasy_scores for ALL weeks up to the input week.
    all_raw_scores AS (
        SELECT
            t.*
        FROM
            generate_series(1, p_game_week_number) AS gw_num
        CROSS JOIN LATERAL
            get_team_fantasy_scores(gw_num, p_season_year, p_league_id) AS t
        WHERE t.game_week_number = gw_num 
    ),

    -- 2. CALCULATE WEEKLY AGGREGATION (Rank, Bonus, Aggregated Score)
    all_weeks_aggregated AS (
        SELECT
            s.game_week_number,
            s.season_year,
            s.game_week_team_id,
            s.user_name,
            s.user_team_name,
            s.user_logo_url,
            s.total_team_fantasy_score AS original_score,
            
            -- Calculate the bonus score
            CASE
                WHEN RANK() OVER (PARTITION BY s.game_week_number ORDER BY s.total_team_fantasy_score DESC) = 1 THEN 20
                WHEN RANK() OVER (PARTITION BY s.game_week_number ORDER BY s.total_team_fantasy_score DESC) = 2 THEN 10
                WHEN RANK() OVER (PARTITION BY s.game_week_number ORDER BY s.total_team_fantasy_score DESC) = 3 THEN 5
                ELSE 0
            END AS weekly_bonus_score,
            
            -- Calculate the aggregated weekly score (original + bonus)
            (s.total_team_fantasy_score +
                CASE
                    WHEN RANK() OVER (PARTITION BY s.game_week_number ORDER BY s.total_team_fantasy_score DESC) = 1 THEN 20
                    WHEN RANK() OVER (PARTITION BY s.game_week_number ORDER BY s.total_team_fantasy_score DESC) = 2 THEN 10
                    WHEN RANK() OVER (PARTITION BY s.game_week_number ORDER BY s.total_team_fantasy_score DESC) = 3 THEN 5
                    ELSE 0
                END
            ) AS aggregated_weekly_score
            
        FROM
            all_raw_scores AS s
    ),

    -- 3. CALCULATE CUMULATIVE SCORE: The running total must be calculated in a separate CTE 
    -- *before* any filtering is done.
    all_weeks_accumulated AS (
        SELECT
            a.*,
            -- Calculate the ACCUMULATED TOTAL SCORE, partitioned by USER_NAME
            SUM(a.aggregated_weekly_score) OVER (
                PARTITION BY a.user_name 
                ORDER BY a.game_week_number
            ) AS accumulated_total_score
        FROM 
            all_weeks_aggregated AS a
    )

    -- 4. FINAL SELECTION: Now, filter the fully calculated data set.
    SELECT
        final.game_week_number,
        final.season_year,
        final.game_week_team_id,
        final.user_name,
        final.user_team_name,
        final.user_logo_url,
        final.original_score AS original_weekly_score,
        final.weekly_bonus_score,
        final.aggregated_weekly_score,
        final.accumulated_total_score
    FROM 
        all_weeks_accumulated AS final
    
    -- CORRECT FILTER: Apply WHERE clause after the running total is calculated
    WHERE 
        final.game_week_number = p_game_week_number
    
    ORDER BY
        final.accumulated_total_score DESC;

$$ LANGUAGE sql;

drop FUNCTION calculate_position_battle_scores;
CREATE OR REPLACE FUNCTION calculate_position_battle_scores(
    p_game_week_number INTEGER,
    p_season_year INTEGER,
    p_league_id INTEGER
)
RETURNS TABLE (
    game_week_match_id BIGINT,
    match_winner_user_id BIGINT,
    match_loser_user_id BIGINT,
    winner_battle_wins INTEGER,
    loser_battle_wins INTEGER,
    matchup_result_points INTEGER,
    weekly_bonus_points INTEGER,
    home_raw_score NUMERIC,
    away_raw_score NUMERIC
) AS $$

WITH 
-- 1. Get ALL Matchups (Source of Truth for the scheduled matches)
all_matchups AS (
    SELECT
        gwm.id AS game_week_match_id,
        gwt_home.user_id AS home_user_id,
        gwt_away.user_id AS away_user_id
    FROM
        game_week_matchups AS gwm
    JOIN game_week_teams AS gwt_home ON gwm.home_game_week_team_ids[1] = gwt_home.id
    JOIN game_week_teams AS gwt_away ON gwm.away_game_week_team_ids[1] = gwt_away.id
    JOIN game_weeks AS gw ON gwm.game_week_id = gw.id
    WHERE
        gw.number = p_game_week_number
        AND gw.season_year = p_season_year
        AND gwt_home.league_id = p_league_id
),

-- 2. Get Raw Scores for Players
raw_data AS (
    SELECT
        t.*,
        gwt.user_id,
        ROW_NUMBER() OVER (
            PARTITION BY t.game_week_match_id, gwt.user_id, t.roster_slot
            ORDER BY t.fantasy_score DESC
        ) AS battle_rn 
    FROM
        get_individual_player_fantasy_scores(p_game_week_number, p_season_year, p_league_id) AS t
    JOIN game_week_teams AS gwt ON t.game_week_team_id = gwt.id
    WHERE t.roster_slot NOT IN ('BEN', 'IR')
),

-- 3. Define the set of ALL unique battle slots and users for joining
unique_battle_slots AS (
    -- This CTE is inefficient due to rd1 JOIN rd2; keeping it simple for now, but a simpler JOIN on all_matchups/raw_data is better.
    SELECT DISTINCT
        rd1.game_week_match_id,
        rd1.roster_slot,
        rd1.battle_rn,
        rd1.user_id AS user_id_a,
        rd2.user_id AS user_id_b
    FROM 
        raw_data rd1
    JOIN 
        raw_data rd2 ON rd1.game_week_match_id = rd2.game_week_match_id
    WHERE 
        rd1.user_id < rd2.user_id
),

-- 4. Get the Tie-Breaker Scores for the Current Week
tie_breaker_scores AS (
    SELECT
        tbs.game_week_team_id,
        tbs.user_name,
        tbs.original_weekly_score
    FROM
        -- Renamed from calculate_and_accumulate_scores to reflect optimized version
        calculate_and_accumulate_scores(p_game_week_number, p_season_year, p_league_id) AS tbs 
),

-- 5. Calculate Battle Winners and Scores
 calculated_battles AS (
    SELECT
        am.game_week_match_id,
        am.home_user_id AS team_a_user_id,
        am.away_user_id AS team_b_user_id,
        rd_a.roster_slot, -- Included for individual ranking
        rd_a.battle_rn,  -- Included for individual ranking
        COALESCE(rd_a.fantasy_score, 0) AS team_a_score,
        COALESCE(rd_b.fantasy_score, 0) AS team_b_score,
        
        CASE
            WHEN COALESCE(rd_a.fantasy_score, 0) > COALESCE(rd_b.fantasy_score, 0) THEN am.home_user_id
            WHEN COALESCE(rd_b.fantasy_score, 0) > COALESCE(rd_a.fantasy_score, 0) THEN am.away_user_id
            ELSE NULL 
        END AS battle_winner_user_id
    FROM
        all_matchups AS am
    JOIN unique_battle_slots AS ubs ON am.game_week_match_id = ubs.game_week_match_id
    LEFT JOIN raw_data as rd_a
    ON am.game_week_match_id = rd_a.game_week_match_id 
        AND am.home_user_id = rd_a.user_id 
        AND ubs.roster_slot = rd_a.roster_slot 
        AND ubs.battle_rn = rd_a.battle_rn
    LEFT JOIN raw_data as rd_b
    ON am.game_week_match_id = rd_b.game_week_match_id 
        AND am.away_user_id = rd_b.user_id 
        AND ubs.roster_slot = rd_b.roster_slot 
        AND ubs.battle_rn = rd_b.battle_rn
    WHERE COALESCE(rd_a.fantasy_score, 0) > 0 OR COALESCE(rd_b.fantasy_score, 0) > 0
),

-- NEW 6. Calculate Individual Player Bonus Tier (Rule: +3/+2/+1 for top 3 battle wins)
individual_battle_wins AS (
    SELECT
        rd.user_id,
        rd.game_week_match_id,
        rd.fantasy_score, -- Needed for the rank tie-breaker
        SUM(CASE WHEN rd.user_id = cb.battle_winner_user_id THEN 1 ELSE 0 END) AS total_individual_battle_wins
    FROM 
        raw_data rd
    JOIN calculated_battles cb ON rd.game_week_match_id = cb.game_week_match_id
    GROUP BY 1, 2, 3
),

-- NEW 7. Assign Rank and Bonus to the Top 3 Battle Winners
player_bonus AS (
    SELECT
        ibw.game_week_match_id,
        ibw.user_id,
        ibw.total_individual_battle_wins,
        -- Rank based on Battle Wins, tied by Fantasy Score (DESC for both)
        RANK() OVER (ORDER BY ibw.total_individual_battle_wins DESC, ibw.fantasy_score DESC) AS weekly_player_rank,
        
        -- Assign bonus points
        CASE
            WHEN RANK() OVER (ORDER BY ibw.total_individual_battle_wins DESC, ibw.fantasy_score DESC) = 1 THEN 3
            WHEN RANK() OVER (ORDER BY ibw.total_individual_battle_wins DESC, ibw.fantasy_score DESC) = 2 THEN 2
            WHEN RANK() OVER (ORDER BY ibw.total_individual_battle_wins DESC, ibw.fantasy_score DESC) = 3 THEN 1
            ELSE 0
        END AS individual_bonus_points
    FROM 
        individual_battle_wins ibw
),

-- 8. Aggregate Battle Wins per Team
matchup_battle_totals AS (
    SELECT
        am.game_week_match_id,
        am.home_user_id AS team_a_user_id,
        am.away_user_id AS team_b_user_id,
        
        COALESCE(SUM(CASE WHEN pb.battle_winner_user_id = am.home_user_id THEN 1 ELSE 0 END), 0) AS team_a_wins,
        COALESCE(SUM(CASE WHEN pb.battle_winner_user_id = am.away_user_id THEN 1 ELSE 0 END), 0) AS team_b_wins
    FROM
        all_matchups AS am
    LEFT JOIN
        calculated_battles AS pb ON am.game_week_match_id = pb.game_week_match_id
    GROUP BY 1, 2, 3
),

-- 9. Determine Match Winner (Battle Wins + Tie Breaker)
matchup_outcomes AS (
    SELECT
        mbt.game_week_match_id,
        mbt.team_a_user_id,
        mbt.team_b_user_id,
        mbt.team_a_wins,
        mbt.team_b_wins,
        
        -- Get game_week_team_id to link to tie_breaker_scores
        gwt_home.id AS home_team_id,
        gwt_away.id AS away_team_id,
        tbs_home.original_weekly_score AS home_raw_score,
        tbs_away.original_weekly_score AS away_raw_score,
        
        -- Determine Match Winner using Battle Wins, tied by Raw Score
        CASE
            WHEN mbt.team_a_wins > mbt.team_b_wins THEN mbt.team_a_user_id
            WHEN mbt.team_b_wins > mbt.team_a_wins THEN mbt.team_b_user_id
            WHEN mbt.team_a_wins = mbt.team_b_wins THEN
                CASE
                    WHEN tbs_home.original_weekly_score > tbs_away.original_weekly_score THEN mbt.team_a_user_id
                    WHEN tbs_away.original_weekly_score > tbs_home.original_weekly_score THEN mbt.team_b_user_id
                    ELSE NULL -- True tie even after breaker
                END
            ELSE NULL 
        END AS match_winner_user,
        
        -- Determine Match Loser
        CASE
            WHEN mbt.team_a_wins < mbt.team_b_wins THEN mbt.team_a_user_id
            WHEN mbt.team_b_wins < mbt.team_a_wins THEN mbt.team_b_user_id
            WHEN mbt.team_a_wins = mbt.team_b_wins THEN
                CASE
                    WHEN tbs_home.original_weekly_score < tbs_away.original_weekly_score THEN mbt.team_a_user_id
                    WHEN tbs_away.original_weekly_score < tbs_home.original_weekly_score THEN mbt.team_b_user_id
                    ELSE NULL
                END
            ELSE NULL
        END AS match_loser_user,
        
        -- Matchup Win Flag
        CASE
            WHEN mbt.team_a_wins <> mbt.team_b_wins THEN TRUE
            WHEN mbt.team_a_wins = mbt.team_b_wins AND tbs_home.original_weekly_score <> tbs_away.original_weekly_score THEN TRUE
            ELSE FALSE
        END AS is_matchup_winner
        
    FROM
        matchup_battle_totals mbt
    JOIN game_week_matchups AS gwm ON mbt.game_week_match_id = gwm.id
    JOIN game_week_teams AS gwt_home ON gwm.home_game_week_team_ids[1] = gwt_home.id
    JOIN game_week_teams AS gwt_away ON gwm.away_game_week_team_ids[1] = gwt_away.id
    LEFT JOIN tie_breaker_scores AS tbs_home ON gwt_home.id = tbs_home.game_week_team_id
    LEFT JOIN tie_breaker_scores AS tbs_away ON gwt_away.id = tbs_away.game_week_team_id
),

-- 10. Final Calculation of all points for the winning team
final_score_calculation AS (
    SELECT
        am.game_week_match_id,
        am.home_user_id,
        am.away_user_id,
        mbt.team_a_wins,
        mbt.team_b_wins,
        mo.match_winner_user,
        mo.match_loser_user,
        mo.home_raw_score,
        mo.away_raw_score,
        
        -- Total Matchup Points for Home Team (User A)
        mbt.team_a_wins + -- 1 pt per battle win
        COALESCE(SUM(CASE WHEN pb.user_id = am.home_user_id THEN pb.individual_bonus_points ELSE 0 END), 0) + -- Individual Top 3 Bonus
        CASE WHEN mo.match_winner_user = am.home_user_id THEN 5 ELSE 0 END AS team_a_total_score, -- +5 Matchup Win Bonus
        
        -- Total Matchup Points for Away Team (User B)
        mbt.team_b_wins + -- 1 pt per battle win
        COALESCE(SUM(CASE WHEN pb.user_id = am.away_user_id THEN pb.individual_bonus_points ELSE 0 END), 0) + -- Individual Top 3 Bonus
        CASE WHEN mo.match_winner_user = am.away_user_id THEN 5 ELSE 0 END AS team_b_total_score -- +5 Matchup Win Bonus
        
    FROM all_matchups AS am
    JOIN matchup_battle_totals AS mbt ON am.game_week_match_id = mbt.game_week_match_id
    JOIN matchup_outcomes AS mo ON am.game_week_match_id = mo.game_week_match_id
    -- LEFT JOIN to get player bonuses
    LEFT JOIN player_bonus AS pb ON am.game_week_match_id = pb.game_week_match_id -- Assuming game_week_match_id is the right join key for pb
    GROUP BY 1, 2, 3, 4, 5, 6, 7, 8, 9
)

-- 11. Final Output
SELECT
    fsc.game_week_match_id,
    fsc.match_winner_user AS match_winner_user_id,
    fsc.match_loser_user AS match_loser_user_id,
    
    -- Winner's total battle wins (for display)
    CASE WHEN fsc.match_winner_user = fsc.home_user_id THEN fsc.team_a_wins ELSE fsc.team_b_wins END AS winner_battle_wins,
    
    -- Loser's total battle wins (for display)
    CASE WHEN fsc.match_loser_user = fsc.home_user_id THEN fsc.team_a_wins ELSE fsc.team_b_wins END AS loser_battle_wins,
    
    -- Matchup result points: the total aggregated score for the winning team
    GREATEST(fsc.team_a_total_score, fsc.team_b_total_score) AS matchup_result_points, 
    
    -- Total bonus points: The +5 for win + player bonuses for the winner
    CASE
        WHEN fsc.match_winner_user = fsc.home_user_id THEN fsc.team_a_total_score - fsc.team_a_wins
        WHEN fsc.match_winner_user = fsc.away_user_id THEN fsc.team_b_total_score - fsc.team_b_wins
        ELSE 0
    END AS weekly_bonus_points, -- This includes +5 win bonus and individual +3/+2/+1
    fsc.home_raw_score,
    fsc.away_raw_score
FROM final_score_calculation AS fsc;
$$ LANGUAGE sql;
----

DROP function calculate_position_battle_leaderboard;
CREATE OR REPLACE FUNCTION calculate_position_battle_leaderboard(
    p_game_week_number INTEGER,
    p_season_year INTEGER,
    p_league_id INTEGER
)
RETURNS TABLE (
    user_id BIGINT,
    user_name VARCHAR,
    user_team_name VARCHAR,
    user_team_logo VARCHAR,
    wins INTEGER,
    losses INTEGER,
    ties INTEGER,
    total_battle_points INTEGER,
    total_battle_bonus_points INTEGER
)
AS $$
WITH 
-- 1. Get all match results and bonus points from Week 1 up to the current week
all_match_results AS (
    SELECT
        b.match_winner_user_id,
        b.match_loser_user_id,
        b.matchup_result_points,
        b.weekly_bonus_points
    FROM
        generate_series(1, p_game_week_number) AS gw_num
    CROSS JOIN LATERAL
        calculate_position_battle_scores(gw_num, p_season_year, p_league_id) AS b
),

-- 2. Unpivot the results to get a single row per user outcome (Win or Loss)
user_outcomes AS (
    -- Rows for Winners
    SELECT
        match_winner_user_id AS user_id,
        matchup_result_points,
        1 AS is_win,
        0 AS is_loss,
        weekly_bonus_points AS bonus_points
    FROM 
        all_match_results
    WHERE 
        match_winner_user_id IS NOT NULL
    
    UNION ALL
    
    -- Rows for Losers
    SELECT
        match_loser_user_id AS user_id,
        matchup_result_points,
        0 AS is_win,
        1 AS is_loss,
        0 AS bonus_points
    FROM
        all_match_results
    WHERE
        match_loser_user_id IS NOT NULL
),

-- 3. Final Aggregation to sum W-L-T and Bonus Points for the entire season
calculated_leaderboard AS (
    SELECT
        uo.user_id,
        SUM(uo.is_win) AS total_wins,
        SUM(uo.is_loss) AS total_losses,
        0 AS total_ties, -- Still assumed to be 0,
        SUM(uo.matchup_result_points) as total_matchup_points,
        SUM(uo.bonus_points) AS total_bonus_points
    FROM
        user_outcomes uo
    GROUP BY
        uo.user_id
)

-- 4. Final Output: LEFT JOIN the results to the list of all users
SELECT
    u.user_id,
    u.name,
    u.team_name,
    u.logo_url,
    -- Use COALESCE to show 0 for users with no wins/losses (who were not in calculated_leaderboard)
    COALESCE(cl.total_wins, 0) AS wins,
    COALESCE(cl.total_losses, 0) AS losses,
    COALESCE(cl.total_ties, 0) AS ties,
    COALESCE(cl.total_matchup_points, 0) AS total_battle_points,
    COALESCE(cl.total_bonus_points, 0) AS total_battle_bonus_points
FROM
    calculated_leaderboard AS cl
JOIN
    users as u on cl.user_id = u.user_id
ORDER BY
    wins DESC,
    losses ASC,
    total_battle_bonus_points DESC;


$$ LANGUAGE sql;
------

-- select * from get_draft_pool(1,2024, 'ESPN' )
-- select * from get_player_fantasy_scoress(1, 2024, 'ESPN')
-- select * from get_team_fantasy_scores(1, 2024, 2)
-- select * from get_individual_player_fantasy_scores(1,2024,14)
-- select * from get_team_roster_with_scores(1, 2024, 2)


