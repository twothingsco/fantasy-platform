# fantasy-platform

A fantasy football league simulator built on Supabase, fed with live NFL data
from Genius Sports.

You create a league, the system generates teams and a schedule, runs an
auto-draft, then walks the season week by week — setting lineups, pulling in
real player stats, and scoring matchups. Progress is broadcast over Supabase
Realtime so a client can watch a draft or a week resolve as it happens.

Leagues can also be seeded from a **real** Yahoo or ESPN league, so you can
replay a season you actually played.

---

## The three apps

```
fantasy-platform/
├── apps/
│   ├── sim-edge/      ← the app.  Supabase edge functions + fantasy schema
│   ├── genius-feed/   ← the data.  Genius Sports live stats → Supabase
│   └── dashboard/     ← the UI.    SvelteKit (early, incomplete)
├── db/                ← SQL schema, policies, scoring functions, seed data
├── api-tests/         ← Bruno collection — one request per edge function
└── archive/           ← superseded code, kept for reference only
```

| App | Runtime | What it does |
|---|---|---|
| **`apps/sim-edge`** | Deno / Supabase Edge Functions | Every piece of league behaviour: setup, draft, weekly management, scoring, Yahoo/ESPN import. This is the product. |
| **`apps/genius-feed`** | Deno CLI scripts | Fills the database. Seeds NFL teams and players, loads each week's fixtures, and subscribes to a live per-game Ably feed to write player stats as they happen. |
| **`apps/dashboard`** | SvelteKit + Vite | A thin operator UI for kicking off league setup and viewing rosters. Least finished piece. |

Each app has its own README with setup and run commands.

### How they fit together

```
   Genius Sports API                    Yahoo / ESPN APIs
          │                                     │
          │ apps/genius-feed                    │ apps/sim-edge
          │ (fixtures, players, live stats)     │ (create-yahoo, create-espn)
          ▼                                     ▼
   ┌──────────────────────────────────────────────────┐
   │        Supabase  ·  `fantasy` schema             │
   │  leagues · game_weeks · game_week_teams          │
   │  game_week_team_players · matchups               │
   │  match_players · nfl_players · modes             │
   └──────────────────────────────────────────────────┘
          ▲                                     │
          │ edge functions                      │ Realtime broadcast
          │ (draft, weekly mgmt, scoring)       ▼
   apps/sim-edge  ◄───────────────────────  apps/dashboard
```

`genius-feed` writes the *real world* (which players exist, what they did last
Sunday). `sim-edge` reads that and runs the *game* on top of it.

---

## Environments

There are two Supabase projects. Both run the same schema.

| Name | Project ref | Notes |
|---|---|---|
| `fantasy` | `lwhqqyhgosxxoejskwfu` | The main project |
| `pointzone` | `fmzupmsctelynwgjmlnz` | Second variant |

Plus local, via the Supabase CLI, at `http://127.0.0.1:54321`.

Every app reads its config from environment variables — nothing is hardcoded.
Start from [`.env.example`](.env.example) at the repo root, which documents
every variable the platform uses and which app needs it.

---

## Running the whole thing from scratch

### 1. Database

```bash
supabase start                      # local stack on :54321
```

Then apply the schema in order — see [`db/README.md`](db/README.md). Short version:

```bash
cd db
for f in "1. fantasy.schema.sql" "2. policies.sql" "3. modes.sql" \
         "4. setupDefaults.sql" "5. scoring.sql"; do
  psql "postgresql://postgres:postgres@127.0.0.1:54322/postgres" -f "$f"
done
```

In a hosted project, also add `fantasy` to **Exposed schemas** under
Project Settings → API, or PostgREST won't see any of these tables.

### 2. Seed the NFL world

```bash
cd apps/genius-feed
cp .env.example .env.local && $EDITOR .env.local
deno run --allow-all --env-file=.env.local src/teams.ts          # teams + players
deno run --allow-all --env-file=.env.local src/loadNFLGames.ts 2025 1   # week 1 fixtures
```

### 3. Serve the edge functions

```bash
cd apps/sim-edge
cp .env.example .env && $EDITOR .env
supabase functions serve
```

### 4. Create and run a league

Use the Bruno collection in [`api-tests/`](api-tests/README.md), or curl:

```bash
curl -X POST http://127.0.0.1:54321/functions/v1/generate-teams \
  -H "Authorization: Bearer $SUPABASE_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{"season": 2025, "leagueId": 22}'

curl -X POST http://127.0.0.1:54321/functions/v1/run-draft ...
curl -X POST http://127.0.0.1:54321/functions/v1/run-weekly-management ...
```

### 5. Watch a live game land

```bash
cd apps/genius-feed
deno run --allow-all --env-file=.env.local src/genuisLiveStats.ts <gameWeekId> <fixtureId>
```

### 6. Dashboard (optional)

```bash
cd apps/dashboard
cp .env.example .env.development && $EDITOR .env.development
npm install && npm run dev
```

---

## Secrets

`.gitignore` blocks `.env*` (except `.env.example`), `*.pem`, `token.json` and
any `*credentials*.txt` / `*creds*.txt`. Keep it that way.

If you're resurrecting this from the old pre-monorepo directories: the Genius
Sports, Ably, OpenAI and Supabase `service_role` keys that used to sit in
plaintext there should be **rotated** before you use them again.

---

## Known rough edges

- `apps/genius-feed/src/teams.ts` has 5 pre-existing implicit-`any` type errors,
  so `deno check` fails on that one file. It runs fine.
- Several genius-feed scripts execute on import (work at module top level rather
  than behind a `main()`), so importing one runs it.
- `apps/dashboard` is incomplete — it predates most of `sim-edge`.
- `db/` holds several historical schema variants alongside the numbered set;
  only the numbered files are current.
