--QB, RB, TE, 
playername,playerid,pos,team,playeropponent,passingyds,passingtd,passingint,rushingyds,rushingtd,receivingrec,receivingyds,receivingtd,rettd,fumtd,2pt,fum,fanptsagainst_pts,touchcarries,touchreceptions,touches,targetsreceptions,targets,receptionpercentage,rztarget,rztouch,rzg2g,rank,totalpoints

DROP TABLE IF EXISTS NFL_RESULTS;

CREATE TABLE IF NOT EXISTS NFL_RESULTS (
    PlayerName VARCHAR(255),
    PlayerId INTEGER, -- Assuming PlayerId is an integer
    pos VARCHAR(10),   -- e.g., QB, RB, WR, TE, DEF
    team VARCHAR(10),
    PlayerOpponent VARCHAR(10),
    passingyds INTEGER,
    passingtd INTEGER,
    passingint INTEGER,
    rushingyds INTEGER,
    rushingtd INTEGER,
    receivingrec INTEGER, -- Receptions
    receivingyds INTEGER,
    receivingtd INTEGER,
    rettd INTEGER,      -- Return Touchdown
    fumtd INTEGER,      -- Fumble Touchdown
    2pt INTEGER,      -- 2-point conversions (assuming integer value)
    fum INTEGER,         -- Fumbles
    fanptsagainst_pts NUMERIC(8,2), -- Assuming this could be a decimal, adjust precision as needed
    touchcarries INTEGER,
    touchreceptions INTEGER,
    touches INTEGER,
    targetsreceptions INTEGER, -- Targets where a reception was possible
    targets INTEGER,
    receptionpercentage NUMERIC(5,2), -- Percentage, e.g., 0.65 for 65%
    rztarget INTEGER,   -- Red Zone Target
    rztouch INTEGER,    -- Red Zone Touch
    rzg2g INTEGER,      -- Red Zone Goal-to-Go
    rank INTEGER,
    totalpoints NUMERIC(8,2) -- Assuming total points could be a decimal
);


-- Defensive list 
playername,playerid,pos,team,playeropponent,tacklestot,tacklesast,tacklessck,tacklestfl,turnoverint,turnoverfrcfum,turnoverfumrec,scoreinttd,scorefumtd,scoreblktd,scoresaf,scoredef2ptret,blk,pdef,qbhit,returnintyds,returnfumyds,rank,totalpoints

DROP TABLE IF EXISTS NFL_DEFENSIVE_RESULTS;
CREATE TABLE IF NOT EXISTS NFL_DEFENSIVE_RESULTS (
    PlayerName VARCHAR(255),
    PlayerId INTEGER,
    Pos VARCHAR(10),
    Team VARCHAR(10),
    PlayerOpponent VARCHAR(10),
    TacklesTot INTEGER,
    TacklesAst INTEGER,
    TacklesSck NUMERIC(8,2), -- Assuming TacklesSck is a decimal for sacks
    TacklesTfl INTEGER,
    TurnoverInt INTEGER,
    TurnoverFrcFum INTEGER,
    TurnoverFumRec INTEGER,
    ScoreIntTd INTEGER,
    ScoreFumTd INTEGER,
    ScoreBlkTd INTEGER,
    ScoreSaf INTEGER,
    ScoreDef2ptRet INTEGER,
    Blk INTEGER,
    PDef INTEGER,
    QBHit INTEGER,
    ReturnIntYds INTEGER,
    ReturnFumYds INTEGER,
    Rank INTEGER,
    TotalPoints NUMERIC(8,2)
);


-- Kicker List 
playername,playerid,pos,team,playeropponent,patmade,patmissed,fgmade_0_19,fgmade_20_29,fgmade_30_39,fgmade_40_49,fgmade_50,fgmiss_0_19,fgmiss_20_29,fgmiss_30_39,rank,totalpoints

CREATE TABLE IF NOT EXISTS KICKER_RESULTS (
    PlayerName VARCHAR(255),
    PlayerId INTEGER,
    Pos VARCHAR(10),
    Team VARCHAR(10),
    PlayerOpponent VARCHAR(10),
    PatMade INTEGER,
    PatMissed INTEGER,
    FgMade_0_19 INTEGER,  -- Renamed from FgMade_0-19 to use underscore for SQL compatibility
    FgMade_20_29 INTEGER, -- Renamed from FgMade_20-29
    FgMade_30_39 INTEGER, -- Renamed from FgMade_30-39
    FgMade_40_49 INTEGER, -- Renamed from FgMade_40-49
    FgMade_50 INTEGER,    -- Renamed from FgMade_50 (assuming FgMade_50+ for brevity)
    FgMiss_0_19 INTEGER,  -- Renamed from FgMiss_0-19
    FgMiss_20_29 INTEGER, -- Renamed from FgMiss_20-29
    FgMiss_30_39 INTEGER, -- Renamed from FgMiss_30-39
    Rank INTEGER,
    TotalPoints NUMERIC(8,2)
);


-- Step 1: Populate nfl_teams with distinct team names from NFL_RESULTS
-- This ensures that all teams mentioned in NFL_RESULTS exist in nfl_teams
-- and we can get their corresponding IDs.
INSERT INTO nfl_teams (name, created_at, updated_at)
SELECT DISTINCT Team, NOW(), NOW() FROM NFL_RESULTS
UNION ALL
SELECT DISTINCT Team, NOW(), NOW() FROM NFL_DEFENSIVE_RESULTS
UNION ALL
SELECT DISTINCT Team, NOW(), NOW() FROM KICKER_RESULTS
ON CONFLICT (name) DO NOTHING; -- Prevents errors if team name already exists


-- Step 2: Populate nfl_players with distinct players from NFL_RESULTS
-- We join with nfl_teams to get the correct nfl_team_id.
-- Assuming NFL_RESULTS.player_id should map to nfl_players.nfl_id,
-- and that nfl_id should be unique for each player.
INSERT INTO nfl_players (name, nfl_id, nfl_team_id, position_type, created_at, updated_at)
SELECT DISTINCT
    temp.PlayerName,
    temp.PlayerId::VARCHAR(255), -- Cast PlayerId to VARCHAR to match nfl_id
    nt.id AS nfl_team_id,
    temp.Pos,
    NOW(),
    NOW()
FROM (
    SELECT PlayerName, PlayerId, Pos, Team FROM NFL_RESULTS
    UNION ALL
    SELECT PlayerName, PlayerId, Pos, Team FROM NFL_DEFENSIVE_RESULTS
    UNION ALL
    SELECT PlayerName, PlayerId, Pos, Team FROM KICKER_RESULTS
) AS temp
JOIN nfl_teams AS nt ON temp.Team = nt.name
ON CONFLICT (nfl_id) DO NOTHING; -- Prevents duplicate players if nfl_id is unique

-- STEP 3: Populate match_players from NFL_RESULTS
INSERT INTO match_players (
    passing_yards, passing_tds, passing_twoptm,
    rushing_yards, rushing_tds, rushing_twoptm,
    receiving_yards, receiving_tds, receiving_twoptm,
    times_sacked, fumbles_lost, interceptions_thrown,
    field_goals_kicked, extra_points_kicked,
    sacks_made, defense_touchdowns, fumbles_won, interceptions_caught,
    points_conceded, points, game_week_id, nfl_player_id,
    created_at, updated_at
)
SELECT
    COALESCE(nr.passingyds, 0),
    COALESCE(nr.passingtd, 0),
    COALESCE(nr."2pt", 0), -- Maps to passing_twoptm, as it's typically an offensive 2pt conversion
    COALESCE(nr.rushingyds, 0),
    COALESCE(nr.rushingtd, 0),
    0, -- rushing_twoptm not directly available in NFL_RESULTS as distinct from general two_pt
    COALESCE(nr.receivingyds, 0),
    COALESCE(nr.receivingtd, 0),
    0, -- receiving_twoptm not directly available
    0, -- times_sacked not in NFL_RESULTS
    COALESCE(nr.fum, 0), -- Assuming 'fum' is fumbles_lost
    COALESCE(nr.passingint, 0),
    0, -- field_goals_kicked not applicable
    0, -- extra_points_kicked not applicable
    0, 0, 0, 0, -- Defensive stats not applicable
    COALESCE(nr.fanptsagainst_pts, 0), -- Assuming this maps to points conceded
    COALESCE(nr.TotalPoints, 0),
    YOUR_GAME_WEEK_ID, -- <<< REMEMBER TO SET YOUR GAME WEEK ID HERE
    np.id AS nfl_player_id,
    NOW(),
    NOW()
FROM
    NFL_RESULTS AS nr
JOIN
    nfl_players AS np ON nr.PlayerId::VARCHAR(255) = np.nfl_id;

--DEFENSE 
INSERT INTO match_players (
    passing_yards, passing_tds, passing_twoptm,
    rushing_yards, rushing_tds, rushing_twoptm,
    receiving_yards, receiving_tds, receiving_twoptm,
    times_sacked, fumbles_lost, interceptions_thrown,
    field_goals_kicked, extra_points_kicked,
    sacks_made, defense_touchdowns, fumbles_won, interceptions_caught,
    points_conceded, points, game_week_id, nfl_player_id,
    created_at, updated_at
)
SELECT
    0, 0, 0, -- Offensive passing stats not applicable
    0, 0, 0, -- Offensive rushing stats not applicable
    0, 0, 0, -- Offensive receiving stats not applicable
    0, 0, 0, -- Offensive turnover/sacked stats not applicable
    0, 0,    -- Kicking stats not applicable
    COALESCE(ndr.TacklesSck, 0), -- Sacks made by defense
    (COALESCE(ndr.ScoreIntTd, 0) + COALESCE(ndr.ScoreFumTd, 0) + COALESCE(ndr.ScoreBlkTd, 0)), -- Sum of defensive TDs
    COALESCE(ndr.TurnoverFumRec, 0), -- Fumbles recovered by defense
    COALESCE(ndr.TurnoverInt, 0), -- Interceptions caught by defense
    0, -- points_conceded not directly from defensive player stats here, leave as 0 or derive if needed
    COALESCE(ndr.TotalPoints, 0),
    YOUR_GAME_WEEK_ID, -- <<< REMEMBER TO SET YOUR GAME WEEK ID HERE
    np.id AS nfl_player_id,
    NOW(),
    NOW()
FROM
    NFL_DEFENSIVE_RESULTS AS ndr
JOIN
    nfl_players AS np ON ndr.PlayerId::VARCHAR(255) = np.nfl_id;

-- KICKERS
INSERT INTO match_players (
    passing_yards, passing_tds, passing_twoptm,
    rushing_yards, rushing_tds, rushing_twoptm,
    receiving_yards, receiving_tds, receiving_twoptm,
    times_sacked, fumbles_lost, interceptions_thrown,
    field_goals_kicked, extra_points_kicked,
    sacks_made, defense_touchdowns, fumbles_won, interceptions_caught,
    points_conceded, points, game_week_id, nfl_player_id,
    created_at, updated_at
)
SELECT
    0, 0, 0, -- Offensive passing stats not applicable
    0, 0, 0, -- Offensive rushing stats not applicable
    0, 0, 0, -- Offensive receiving stats not applicable
    0, 0, 0, -- Offensive turnover/sacked stats not applicable
    -- Sum all FgMade columns for total field_goals_kicked
    (COALESCE(kr.FgMade_0_19, 0) + COALESCE(kr.FgMade_20_29, 0) + COALESCE(kr.FgMade_30_39, 0) +
     COALESCE(kr.FgMade_40_49, 0) + COALESCE(kr.FgMade_50, 0)),
    COALESCE(kr.PatMade, 0), -- Extra points kicked
    0, 0, 0, 0, -- Defensive stats not applicable
    0, -- points_conceded not applicable
    COALESCE(kr.TotalPoints, 0),
    YOUR_GAME_WEEK_ID, -- <<< REMEMBER TO SET YOUR GAME WEEK ID HERE
    np.id AS nfl_player_id,
    NOW(),
    NOW()
FROM
    KICKER_RESULTS AS kr
JOIN
    nfl_players AS np ON kr.PlayerId::VARCHAR(255) = np.nfl_id;