# sim-edge scratch notes

Working notes carried over from the pre-monorepo repo. Kept because two of
them record decisions that aren't visible in the code.

---

## Defense scoring: points-conceded bands

A reworking of the `modes` points-conceded columns from 4 coarse bands to 8.
**Check whether this was actually applied** to `lwhqqyhgosxxoejskwfu` and
`fmzupmsctelynwgjmlnz` before trusting defense scores — it was written as a
plan, and `db/5. scoring.sql` is dated after it.

```
0 points allowed = 5pts
1-6 points allowed = 4pts
7-13 points allowed = 3pts
14-17 points allowed = 1pts
18-27 points allowed = 0pts
28-34 points allowed = -1pts
35-45 points allowed = -3pts
46+ points allowed = -5pts




ADD points_conceded_0_score

points_conceded_0_13__score. -- CHANGE TO points_conceded_1_6_score
points_conceded_14_17_score -- CHANGE TO  points_conceded_7_13_score
points_conceded_18_34_score -- CHANGE TO  points_conceded_14_17_score
ADD points_conceded_18_27_score
ADD points_conceded_28_34_score
ADD points_conceded_35_45_score

points_conceded_over_35_score -- CHANGE TO  points_conceded_over_46_score



BEGIN;

ALTER TABLE mods
RENAME COLUMN points_conceded_0_13__score TO points_conceded_1_6_score,
ALTER COLUMN points_conceded_1_6_score SET DEFAULT 4
RENAME COLUMN points_conceded_14_17_score TO points_conceded_7_13_score,
ALTER COLUMN points_conceded_7_13_score SET DEFAULT 3
RENAME COLUMN points_conceded_18_34_score TO points_conceded_14_17_score,
ALTER COLUMN points_conceded_14_17_score SET DEFAULT 1
RENAME COLUMN points_conceded_over_35_score TO points_conceded_over_46_score;
ALTER COLUMN points_conceded_over_46_score SET DEFAULT '-3'::integer,
ADD COLUMN points_conceded_0_score INTEGER DEFAULT 5,
ADD COLUMN points_conceded_18_27_score INTEGER DEFAULT 0,
ADD COLUMN points_conceded_28_34_score INTEGER DEFAULT '-1'::integer,
ADD COLUMN points_conceded_35_45_score INTEGER DEFAULT '-3'::integer


-- Step 1: Execute all RENAME operations first.
ALTER TABLE mods RENAME COLUMN points_conceded_0_13__score TO points_conceded_1_6_score;
ALTER TABLE mods RENAME COLUMN points_conceded_14_17_score TO points_conceded_7_13_score;
ALTER TABLE mods RENAME COLUMN points_conceded_18_34_score TO points_conceded_14_17_score;
ALTER TABLE mods RENAME COLUMN points_conceded_over_35_score TO points_conceded_over_46_score;

-- Step 2: Execute all ALTER COLUMN SET DEFAULT operations.
-- You can chain these with commas under a single ALTER TABLE command, 
-- but you must use the 'ALTER COLUMN' keyword for each one.
ALTER TABLE mods
    ALTER COLUMN points_conceded_1_6_score SET DEFAULT 4,
    ALTER COLUMN points_conceded_7_13_score SET DEFAULT 3,
    ALTER COLUMN points_conceded_14_17_score SET DEFAULT 1,
    ALTER COLUMN points_conceded_over_46_score SET DEFAULT '-3'::integer;

-- Step 3: Execute all ADD COLUMN operations.
-- These can also be chained with commas, preceded by 'ADD COLUMN' for the first.
ALTER TABLE mods
    ADD COLUMN points_conceded_0_score INTEGER DEFAULT 5,
    ADD COLUMN points_conceded_18_27_score INTEGER DEFAULT 0,
    ADD COLUMN points_conceded_28_34_score INTEGER DEFAULT '-1'::integer,
    ADD COLUMN points_conceded_35_45_score INTEGER DEFAULT '-3'::integer;




COMMIT;
   
 CASE
    WHEN mp.points_conceded = 0 THEN m.points_conceded_0_score
    WHEN mp.points_conceded >= 1 AND mp.points_conceded <= 6 THEN m.points_conceded_1_6_score
    WHEN mp.points_conceded > 6 AND mp.points_conceded <= 13 THEN m.points_conceded_7_13_score
    WHEN mp.points_conceded > 13 AND mp.points_conceded <= 17 THEN m.points_conceded_14_17_score
    WHEN mp.points_conceded > 17 AND mp.points_conceded <= 27 THEN m.points_conceded_18_27_score
    WHEN mp.points_conceded > 27 AND mp.points_conceded <= 34 THEN m.points_conceded_28_34_score
    WHEN mp.points_conceded > 34 AND mp.points_conceded <= 45 THEN m.points_conceded_35_45_score
    WHEN mp.points_conceded > 45 THEN m.points_conceded_over_46_score

    -- Handle any possible null or negative values (optional, but good practice)
    ELSE 0 
END```

---

## Yahoo/ESPN league import — the intended sequence

What `create-yahoo` / `create-espn` are meant to do, in order:

1. Fetch the third-party league by ID → `leagues` (needs `mode_id`)
2. Fetch its teams → `users`
3. For each team, fetch the roster → `user_roster`
4. Fetch the schedule → `import-schedule`
5. Fetch the weekly lineups → `import-lineup`

---

## PostgREST select strings

Embedded-resource syntax worked out against the REST API — the shapes behind
the `testQuery` / `testLeague` requests in `api-tests/`.

```
team_name,league_id:user_leagues!inner(),id:leagues!inner()

team_name,league_id:user_leagues!inner(league_id),id:leagues()


league_id,leagues:leagues(name),users:users(auth_user_id, team_name)```
