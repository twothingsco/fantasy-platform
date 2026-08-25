-- Function to get individual player fantasy scores (p_game_week_number, p_season_year, p_mode_name, p_league_id)
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
    FROM game_weeks
    WHERE game_weeks.number = p_game_week_number AND game_weeks.season_year = p_season_year; -- QUALIFIED COLUMNS

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
    FROM
        match_players AS mp
    JOIN
        nfl_players AS np ON mp.nfl_player_id = np.id
    JOIN
        nfl_teams AS nt ON np.nfl_team_id = nt.id
    JOIN
        modes AS m ON m.name = p_mode_name
    WHERE
        mp.game_week_id = v_game_week_id;
END;
$$ LANGUAGE plpgsql;

-- This function takes game_week_number, season_year, mode_name, AND league_id.
CREATE OR REPLACE FUNCTION get_team_fantasy_scores(
    p_game_week_number INTEGER,
    p_season_year INTEGER,
    p_mode_name VARCHAR(255),
    p_league_id INTEGER
)
RETURNS TABLE (
    game_week_number INTEGER,
    season_year INTEGER,
    game_week_team_id BIGINT,
    user_name VARCHAR,
    user_team_name VARCHAR,
    scoring_mode VARCHAR,
    total_team_fantasy_score NUMERIC
) AS $$
DECLARE
    v_game_week_id INTEGER;
BEGIN
    -- Look up the internal game_week_id based on number and season_year
    SELECT id INTO v_game_week_id
    FROM game_weeks
    WHERE game_weeks.number = p_game_week_number AND game_weeks.season_year = p_season_year; -- QUALIFIED COLUMNS

    -- Handle case where game week is not found
    IF v_game_week_id IS NULL THEN
        RAISE EXCEPTION 'Game week (number: %, season: %) not found.', p_game_week_number, p_season_year;
    END IF;

    RETURN QUERY
    SELECT
        p_game_week_number AS game_week_number,
        p_season_year AS season_year,
        gmt.id AS game_week_team_id,
        u.name AS user_name,
        u.team_name AS user_team_name,
        gfs.scoring_mode,
        SUM(gfs.fantasy_score)::NUMERIC AS total_team_fantasy_score
    FROM
        game_week_teams AS gmt
    JOIN
        users AS u ON gmt.user_id = u.id
    JOIN
        game_week_team_players AS gwtp ON gmt.id = gwtp.game_week_team_id
    JOIN
        get_player_fantasy_scores(p_game_week_number, p_season_year, p_mode_name) AS gfs
        ON gwtp.nfl_player_id = gfs.player_id AND gmt.game_week_id = gfs.game_week_id_internal
    WHERE
        gmt.game_week_id = v_game_week_id
        AND gmt.league_id = p_league_id
    GROUP BY
        gmt.id,
        u.name,
        u.team_name,
        gfs.scoring_mode
    ORDER BY
        total_team_fantasy_score DESC;
END;
$$ LANGUAGE plpgsql;

-- This function takes game_week_number, season_year, mode_name, AND league_id.
CREATE OR REPLACE FUNCTION get_individual_player_fantasy_scores(
    p_game_week_number INTEGER,
    p_season_year INTEGER,
    p_mode_name VARCHAR(255),
    p_league_id INTEGER
)
RETURNS TABLE (
    game_week_number INTEGER,
    season_year INTEGER,
    user_name VARCHAR,
    user_fantasy_team_name VARCHAR,
    game_week_team_id BIGINT,
    player_name VARCHAR,
    nfl_team_name VARCHAR,
    position_type VARCHAR,
    fantasy_score NUMERIC
) AS $$
DECLARE
    v_game_week_id INTEGER;
BEGIN
    -- Look up the internal game_week_id based on number and season_year
    SELECT id INTO v_game_week_id
    FROM game_weeks
    WHERE game_weeks.number = p_game_week_number AND game_weeks.season_year = p_season_year; -- QUALIFIED COLUMNS

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
        gmt.id AS game_week_team_id,
        gfs.player_name,
        gfs.nfl_team_name,
        gfs.position_type,
        gfs.fantasy_score
    FROM
        game_week_teams AS gmt
    JOIN
        users AS u ON gmt.user_id = u.id
    JOIN
        game_week_team_players AS gwtp ON gmt.id = gwtp.game_week_team_id
    JOIN
        get_player_fantasy_scores(p_game_week_number, p_season_year, p_mode_name) AS gfs
        ON gwtp.nfl_player_id = gfs.player_id AND gmt.game_week_id = gfs.game_week_id_internal
    WHERE
        gmt.game_week_id = v_game_week_id
        AND gmt.league_id = p_league_id
    ORDER BY
        p_season_year ASC,
        p_game_week_number ASC,
        user_fantasy_team_name ASC,
        gfs.fantasy_score DESC;
END;
$$ LANGUAGE plpgsql;