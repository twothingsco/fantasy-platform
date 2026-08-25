-- Enable RLS and define policies for users
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users are visible to everyone."
ON users FOR SELECT
TO anon, authenticated
USING (true);

CREATE POLICY "Service role can manage users."
ON users FOR ALL
TO service_role
USING (true) WITH CHECK (true);


-- Enable RLS and define policies for leagues
ALTER TABLE leagues ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Leagues are visible to everyone."
ON leagues FOR SELECT
TO anon, authenticated
USING (true);

CREATE POLICY "Service role can manage leagues."
ON leagues FOR ALL
TO service_role
USING (true) WITH CHECK (true);

CREATE POLICY "Allow commissioner to delete league"
ON leagues
FOR DELETE
TO authenticated -- This policy applies only to authenticated users
USING (
    -- The authenticated user's UUID must match the commissioner_user_id
    -- We need to join to the users table to get the auth_user_id
    -- from the user_id that is stored in the leagues table.
    (SELECT au.auth_user_id FROM users au WHERE au.user_id = commissioner_user_id) = auth.uid()
);

-- Enable RLS and define policies for user_leagues
ALTER TABLE user_leagues ENABLE ROW LEVEL SECURITY;

CREATE POLICY "User league relationships are visible to everyone."
ON user_leagues FOR SELECT
TO anon, authenticated
USING (true);

CREATE POLICY "Service role can manage user league relationships."
ON user_leagues FOR ALL
TO service_role
USING (true) WITH CHECK (true);


-- Enable RLS and define policies for nfl_teams
ALTER TABLE nfl_teams ENABLE ROW LEVEL SECURITY;

CREATE POLICY "NFL teams are visible to everyone."
ON nfl_teams FOR SELECT
TO anon, authenticated
USING (true);

CREATE POLICY "Service role can manage NFL teams."
ON nfl_teams FOR ALL
TO service_role
USING (true) WITH CHECK (true);


-- Enable RLS and define policies for nfl_players
ALTER TABLE nfl_players ENABLE ROW LEVEL SECURITY;

CREATE POLICY "NFL players are visible to everyone."
ON nfl_players FOR SELECT
TO anon, authenticated
USING (true);

CREATE POLICY "Service role can manage NFL players."
ON nfl_players FOR ALL
TO service_role
USING (true) WITH CHECK (true);


-- Enable RLS and define policies for nfl_games
ALTER TABLE nfl_games ENABLE ROW LEVEL SECURITY;

CREATE POLICY "NFL GAMES are visible to everyone."
ON nfl_games FOR SELECT
TO anon, authenticated
USING (true);

CREATE POLICY "Service role can manage NFL GAMES."
ON nfl_games FOR ALL
TO service_role
USING (true) WITH CHECK (true);

-- Enable RLS and define policies for nfl_player_types
ALTER TABLE nfl_player_types ENABLE ROW LEVEL SECURITY;

CREATE POLICY "NFL player types are visible to everyone."
ON nfl_player_types FOR SELECT
TO anon, authenticated
USING (true);

CREATE POLICY "Service role can manage NFL player types."
ON nfl_player_types FOR ALL
TO service_role
USING (true) WITH CHECK (true);


-- Enable RLS and define policies for user_roster
ALTER TABLE user_roster ENABLE ROW LEVEL SECURITY;

CREATE POLICY "User rosters are visible to everyone."
ON user_roster FOR SELECT
TO anon, authenticated
USING (true);

CREATE POLICY "Service role can manage user rosters."
ON user_roster FOR ALL
TO service_role
USING (true) WITH CHECK (true);


-- Enable RLS and define policies for game_weeks
ALTER TABLE game_weeks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Game weeks are visible to everyone."
ON game_weeks FOR SELECT
TO anon, authenticated
USING (true);

CREATE POLICY "Service role can manage game weeks."
ON game_weeks FOR ALL
TO service_role
USING (true) WITH CHECK (true);


-- Enable RLS and define policies for game_week_teams
ALTER TABLE game_week_teams ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Game week teams are visible to everyone."
ON game_week_teams FOR SELECT
TO anon, authenticated
USING (true);

CREATE POLICY "Service role can manage game week teams."
ON game_week_teams FOR ALL
TO service_role
USING (true) WITH CHECK (true);


-- Enable RLS and define policies for game_week_team_players
ALTER TABLE game_week_team_players ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Game week team players are visible to everyone."
ON game_week_team_players FOR SELECT
TO anon, authenticated
USING (true);

CREATE POLICY "Service role can manage game week team players."
ON game_week_team_players FOR ALL
TO service_role
USING (true) WITH CHECK (true);


-- Enable RLS and define policies for game_week_matchups
ALTER TABLE game_week_matchups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Game week matchups are visible to everyone."
ON game_week_matchups FOR SELECT
TO anon, authenticated
USING (true);

CREATE POLICY "Service role can manage game week matchups."
ON game_week_matchups FOR ALL
TO service_role
USING (true) WITH CHECK (true);

CREATE POLICY update_game_week_matchup_for_league_member 
ON game_week_matchups FOR UPDATE
TO authenticated -- This specifies the role the policy applies to.
USING (
    -- The user can update the row if their auth_user_id exists
    -- in the users table and is associated with the league
    -- of the matchup.
    EXISTS (
        SELECT 1
        FROM user_leagues AS ul
        JOIN users AS u ON ul.user_id = u.user_id
        JOIN game_week_teams AS gwt ON ul.league_id = gwt.league_id
        WHERE
            u.auth_user_id = auth.uid()
            -- Check if the game week team ID from the user's league matches
            -- either the home or away team ID of the matchup.
            AND (
                gwt.id = home_game_week_team_id
                OR gwt.id = away_game_week_team_id
            )
    )
);


-- enable RLS for game_week_leagues
ALTER TABLE game_week_leagues ENABLE ROW LEVEL security

CREATE POLICY "Service role can manage game week league."
ON game_week_leagues FOR ALL
TO service_role
USING (true) WITH CHECK (true);


CREATE POLICY update_game_week_league_for_league_member 
ON game_week_leagues FOR ALL
TO authenticated -- This specifies the role the policy applies to.
USING (
    -- The user can update the row if their auth_user_id exists
    -- in the users table and is associated with the league
    -- of the matchup.
    EXISTS (
        SELECT 1
        FROM user_leagues AS ul
        JOIN users AS u ON ul.user_id = u.user_id
        WHERE
            u.auth_user_id = auth.uid()
            -- Check if the game week team ID from the user's league matches
            -- either the home or away team ID of the matchup.
            AND ul.league_id = league_id
    )
);

-- Enable RLS and define policies for match_players
ALTER TABLE match_players ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Match players are visible to everyone."
ON match_players FOR SELECT
TO anon, authenticated
USING (true);

CREATE POLICY "Service role can manage match players."
ON match_players FOR ALL
TO service_role
USING (true) WITH CHECK (true);


-- Enable RLS and define policies for modes
ALTER TABLE modes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Modes are visible to everyone."
ON modes FOR SELECT
TO anon, authenticated
USING (true);

CREATE POLICY "Service role can manage modes."
ON modes FOR ALL
TO service_role
USING (true) WITH CHECK (true);


-- Enable RLS and define policies for league_settings
ALTER TABLE league_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "League settings are visible to everyone."
ON league_settings FOR SELECT
TO anon, authenticated
USING (true);

CREATE POLICY "Service role can manage league settings."
ON league_settings FOR ALL
TO service_role
USING (true) WITH CHECK (true);

CREATE POLICY "Service role can manage draft picks."
ON draft_picks FOR ALL
TO service_role
USING (true) WITH CHECK (true);
