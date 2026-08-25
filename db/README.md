# db

The `fantasy` schema — source of truth for the database both apps talk to.

There are no Supabase migrations. Setup is a numbered sequence of SQL files, run
in order. **`1. fantasy.schema.sql` starts with `DROP SCHEMA IF EXISTS fantasy
CASCADE` — it rebuilds from scratch and destroys existing data.**

---

## Run order

| # | File | What it does |
|---|---|---|
| 1 | `1. fantasy.schema.sql` | Drops and recreates the schema — 19 tables, indexes, triggers |
| 2 | `2. policies.sql` | Enables RLS and defines policies |
| 3 | `3. modes.sql` | Seeds scoring modes (the multiplier sets) |
| 4 | `4. setupDefaults.sql` | Default league + league settings |
| 5 | `5. scoring.sql` | Scoring functions — `calculate_player_score` and friends |

`realtime.schema.sql` is separate and optional: it adds the tables to the
realtime publication so clients get row-level change events. The edge functions
use broadcast rather than postgres_changes, so you only need this if you want a
client subscribing to table changes directly.

### Local

```bash
DB="postgresql://postgres:postgres@127.0.0.1:54322/postgres"
for f in "1. fantasy.schema.sql" "2. policies.sql" "3. modes.sql" \
         "4. setupDefaults.sql" "5. scoring.sql"; do
  echo "== $f"; psql "$DB" -f "$f" || break
done
```

### Hosted

Paste each file into the SQL editor in order, then — this is the step that's easy
to miss — add `fantasy` to **Project Settings → API → Exposed schemas**.
Without it PostgREST returns 404 for every table and the edge functions fail with
nothing useful in the logs.

---

## The schema

```
users ──< user_leagues >── leagues ──< league_settings
                              │
                              ├──< game_weeks ──< game_week_teams ──< game_week_team_players
                              │                        │
                              │                        └──< game_week_matchups
                              └──< modes                        (home/away, scores)

nfl_teams ──< nfl_players ──< match_players      ← real-world stats land here
                  │                                (written by apps/genius-feed)
            nfl_player_types
```

Two halves worth keeping straight:

- **Real world** — `nfl_teams`, `nfl_players`, `nfl_games`, `match_players`.
  Filled by [`apps/genius-feed`](../apps/genius-feed/README.md). What actually
  happened on Sunday.
- **The game** — `leagues`, `game_weeks`, `game_week_teams`,
  `game_week_team_players`, `game_week_matchups`. Driven by
  [`apps/sim-edge`](../apps/sim-edge/README.md).

`modes` holds the scoring multipliers (PPR, standard, and variants). A league
points at one via `league_settings`, and `calculate_player_score` in
`5. scoring.sql` joins a `match_players` row to its league's mode to produce a
fantasy score.

---

## Seeding data

After the schema is up:

```bash
cd ../apps/genius-feed
deno run --allow-all --env-file=.env.local src/teams.ts             # NFL teams + players
deno run --allow-all --env-file=.env.local src/loadNFLGames.ts 2025 1
deno run --allow-all --env-file=.env.local src/testStats.ts   2025 1
```

---

## `history/`

Superseded files, kept because the lineage is sometimes useful. Don't run these.

| File | Superseded by |
|---|---|
| `fantasy.schema-old.sql`, `fantasy.schema.v1.sql` | `1. fantasy.schema.sql` |
| `fantasy-schema.policy.sql` | `2. policies.sql` |
| `modes_rows.sql` | `3. modes.sql` |
| `scoring-orig.sql`, `scoringv2.sql` | `5. scoring.sql` |
| `matchGameUPgrade.sql` | An incremental migration, already folded into the schema |
| `data-Import.sql` | The CSV-era import — see `archive/importer` |

---

## Changing the schema

There's no migration tooling, so: edit the numbered file, and if the change is
incremental, also write the `ALTER TABLE` you ran against the live databases —
otherwise the two hosted projects drift from the files.

`apps/sim-edge/supabase/functions/_shared/supabase.ts` and
`apps/genius-feed/src/supabase.ts` are generated types. Regenerate both after any
schema change:

```bash
supabase gen types typescript --project-ref lwhqqyhgosxxoejskwfu --schema fantasy
```
