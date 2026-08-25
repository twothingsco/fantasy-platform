
--
-- CORE Scoring Function
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
-- Gets the scores for all of the players in a matchup.
-- CREATE OR REPLACE FUNCTION get_matchup_fantasy_scores(
--     p_game_week_id BIGINT,
--     p_game_week_matchup_id BIGINT
-- )
-- RETURNS TABLE (
--     player_id BIGINT,
--     player_name VARCHAR,
--     nfl_team_name VARCHAR,
--     position_type VARCHAR,
--     fantasy_score NUMERIC,
--     scoring_mode VARCHAR
-- ) AS $$
-- BEGIN
--     RETURN QUERY
--     SELECT
--         np.id AS player_id,
--         np.name AS player_name,
--         nt.name AS nfl_team_name,
--         np.position_type,
--         -- Find the correct mode for the player and call the core scoring function
--         (SELECT calculate_player_score(np.id, p_game_week_id, mma.mode_id), mode.name AS scoring_mode
--          FROM matchup_mode_assignments AS mma
--          JOIN modes AS mode ON mode.id = mma.mode_id
--          WHERE mma.game_week_matchup_id = p_game_week_matchup_id
--          AND (mma.position_type = np.position_type OR mma.position_type = 'ALL')) AS fantasy_score
--     FROM
--         match_players AS mp
--     JOIN
--         nfl_players AS np ON mp.nfl_player_id = np.id
--     JOIN
--         nfl_teams AS nt ON np.nfl_team_id = nt.id
--     WHERE
--         mp.game_week_id = p_game_week_id;
-- END;
-- $$ LANGUAGE plpgsql;

---
-- Maintains the backward compatibility for the get_team_fantasy_scores function.
-- Uses the new core scoring function to calculate scores.
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
    game_week_id_internal BIGINT,
    scoring_mode VARCHAR,
    fantasy_score NUMERIC
) AS $$
DECLARE
    v_game_week_id BIGINT;
    v_mode_id BIGINT;
BEGIN
    SELECT id INTO v_game_week_id
    FROM game_weeks
    WHERE number = p_game_week_number AND season_year = p_season_year;

    IF v_game_week_id IS NULL THEN
        RAISE EXCEPTION 'Game week (number: %, season: %) not found.', p_game_week_number, p_season_year;
    END IF;
    
    SELECT id INTO v_mode_id FROM modes WHERE name = p_mode_name;

    IF v_mode_id IS NULL THEN
        RAISE EXCEPTION 'Scoring mode "%" not found.', p_mode_name;
    END IF;

    RETURN QUERY
    SELECT
        np.id AS player_id,
        np.name AS player_name,
        nt.name AS nfl_team_name,
        np.position_type,
        mp.game_week_id AS game_week_id_internal,
        p_mode_name AS scoring_mode,
        calculate_player_score(np.id, v_game_week_id, v_mode_id) AS fantasy_score
    FROM
        match_players AS mp
    JOIN
        nfl_players AS np ON mp.nfl_player_id = np.id
    JOIN
        nfl_teams AS nt ON np.nfl_team_id = nt.id
    WHERE
        mp.game_week_id = v_game_week_id;
END;
$$ LANGUAGE plpgsql;

--


-- Function to get individual player fantasy scores for a given league based on weekly matchups
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
    game_week_match_id BIGINT,
    game_week_team_id BIGINT,
    player_name VARCHAR,
    nfl_team_name VARCHAR,
    position_type VARCHAR,
    fantasy_score NUMERIC,
    scoring_mode VARCHAR
)
AS $$
DECLARE
    v_game_week_id BIGINT;
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
    SELECT
        p_game_week_number AS game_week_number,
        p_season_year AS season_year,
        u.name AS user_name,
        u.team_name AS user_fantasy_team_name,
        gwm.id as game_week_match_id,
        gmt.id AS game_week_team_id,
        p.name as player_name,
        t.name as nfl_team_name,
        gwtp.roster_slot as position_type,
        calculate_player_score(p.id, 1, COALESCE(
            (SELECT jsonb_array_elements_text(gwm.mode_assignments -> gwtp.roster_slot)::BIGINT),
            (SELECT jsonb_array_elements_text(gwm.mode_assignments -> 'ALL')::BIGINT)
        )) AS fantasy_score,
        mode.name AS scoring_mode
    FROM
        game_week_matchups AS gwm
    JOIN
        game_week_teams AS gmt ON gwm.away_game_week_team_id = gmt.id OR gwm.home_game_week_team_id = gmt.id
    JOIN
        users AS u ON gmt.user_id = u.user_id
    JOIN
        game_week_team_players AS gwtp ON gmt.id = gwtp.game_week_team_id
    JOIN
        nfl_players AS p ON gwtp.nfl_player_id = p.id
    JOIN
        nfl_teams AS t ON p.nfl_team_id = t.id 
    LEFT JOIN
        modes AS mode ON mode.id = COALESCE(
            (SELECT jsonb_array_elements_text(gwm.mode_assignments -> gwtp.roster_slot)::BIGINT),
            (SELECT jsonb_array_elements_text(gwm.mode_assignments -> 'ALL')::BIGINT)
        )
    WHERE
        gmt.game_week_id = v_game_week_id
        AND gmt.league_id = p_league_id
    ORDER BY
        game_week_match_id ASC,
        user_fantasy_team_name ASC,
        fantasy_score DESC;
END;
$$ LANGUAGE plpgsql;
---

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


---- 
-----
-- League Level (Least Specific): leagues.default_mode_assignments (JSONB)

-- Week Level: game_weeks.mode_assignments (JSONB)

-- Matchup Level: game_week_matchups.mode_assignments (JSONB) (Already exists)

-- Player Level (Most Specific): game_week_team_players.mode_assignment_id (BIGINT) - This is a simplification; a full JSONB for every player is likely overkill and a single ID is more practical for a player-specific override.

---- UPDATED 10/8
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
    game_week_match_id BIGINT,
    game_week_team_id BIGINT,
    player_name VARCHAR,
    nfl_team_name VARCHAR,
    position_type VARCHAR,
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
            ur.nfl_player_id AS nfl_player_id,
            -- Core logic for cascading mode assignment ID retrieval
            COALESCE(
                gwtp.mod_assignment_id, -- 4. Player-specific mode ID (Most Specific Override)
                (gwm.mod_assignments -> gwtp.roster_slot ->> 0)::BIGINT, -- 3a. Matchup-specific Roster Slot mode ID
                (gwm.mod_assignments -> 'ALL' ->> 0)::BIGINT, -- 3b. Matchup-specific 'ALL' mode ID
                (gw.mod_assignments -> gwtp.roster_slot ->> 0)::BIGINT, -- 2a. Week-specific Roster Slot mode ID
                (gw.mod_assignments -> 'ALL' ->> 0)::BIGINT, -- 2b. Week-specific 'ALL' mode ID
                (l.mod_assignments -> gwtp.roster_slot ->> 0)::BIGINT, -- 1a. League-default Roster Slot mode ID
                (l.mod_assignments -> 'ALL' ->> 0)::BIGINT -- 1b. League-default 'ALL' mode ID (Least Specific Default)
            ) AS effective_mode_id

        FROM
            game_week_matchups AS gwm
            JOIN
                game_week_teams AS gmt ON gwm.away_game_week_team_id = gmt.id OR gwm.home_game_week_team_id = gmt.id
            -- Start with the user's full roster (ur) and LEFT JOIN to gwtp
            RIGHT JOIN -- Keep the RIGHT JOIN to make user_roster the driving table
                user_roster AS ur ON gmt.user_id = ur.user_id 
            LEFT JOIN -- Now LEFT JOIN gwtp to the result of the RIGHT JOIN
                game_week_team_players AS gwtp 
                    ON gmt.id = gwtp.game_week_team_id AND ur.nfl_player_id = gwtp.nfl_player_id
            LEFT JOIN -- Now LEFT JOIN the rest of the original tables 
                game_week_leagues AS gw ON gmt.game_week_id = gw.game_week_id AND gmt.league_id = gw.league_id
            JOIN -- This join should still be an INNER JOIN since it's required for mod_assignments
                league_settings AS l ON gmt.league_id = l.id 
        WHERE
            gmt.game_week_id = v_game_week_id
            AND gmt.league_id = p_league_id
    )
    SELECT
        p_game_week_number AS game_week_number,
        p_season_year AS season_year,
        u.name AS user_name,
        u.team_name AS user_fantasy_team_name,
        pma.game_week_match_id,
        pma.game_week_team_id,
        p.name as player_name,
        t.name as nfl_team_name,
        pma.roster_slot as position_type,
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
        fantasy_score DESC;
END;
$$ LANGUAGE plpgsql;