# sim-edge

The app. Every piece of league behaviour lives here as a Supabase Edge Function
(Deno), backed by the `fantasy` schema.

Supabase project refs: `lwhqqyhgosxxoejskwfu` (fantasy) · `fmzupmsctelynwgjmlnz` (pointzone).

---

## Layout

```
supabase/
├── config.toml                 local stack config (exposes the `fantasy` schema)
├── schemas/fantasy.schema.sql  reference copy of the schema
└── functions/
    ├── _shared/                everything reusable — this is where the logic is
    │   ├── services/           league / roster / draft / schedule / scoring
    │   ├── supabase.ts         generated DB types (2,358 lines)
    │   ├── realtimeService.ts  broadcasts progress to clients
    │   └── llmService.ts       LLM calls (team-name generation etc.)
    ├── generate-teams/         ┐
    ├── run-draft/              │
    ├── draft-pick/             │ the simulation
    ├── run-weekly-management/  ┘
    ├── import-lineup/          ┐
    ├── import-schedule/        │ bringing in outside data
    ├── create-yahoo/           │
    ├── create-espn/            │
    ├── mapYahooKeys/           ┘
    ├── auth-handler/           Yahoo OAuth callback
    └── test-socket/            realtime scratchpad
```

The `index.ts` in each function is a thin HTTP wrapper — CORS preflight, parse
body, call a service, broadcast, return. The behaviour is in the sibling
`*Graph.ts` / `*Service.ts` file, or in `_shared/services/`.

The three `*Graph.ts` files (`LeagueSetupGraph`, `DraftGraph`, `WeekGraph`) are a
hand-rolled state-machine pattern carried over from the LangGraph prototype in
[`archive/simulator`](../../archive/simulator) — each stage mutates a shared
`FantasyFootballState` (see `_shared/GraphState_types.ts`) and broadcasts as it
goes.

---

## Functions

### Simulation

| Function | Body | Does |
|---|---|---|
| `generate-teams` | `{ season, teamCount, league_name, auth_user_id, mode_id }` | Creates the league, its teams, and the season schedule |
| `run-draft` | `{ season, currentWeek, leagueId }` | Runs a full auto-draft for every team |
| `draft-pick` | `{ season, currentWeek, leagueId }` | Advances a single pick — for an interactive draft |
| `run-weekly-management` | `{ season, currentWeek, leagueId }` | The weekly cycle: set lineups, apply stats, score matchups, advance the week |

### Import

| Function | Body | Does |
|---|---|---|
| `create-yahoo` | `{ season, leagueId, access_token, refresh_token, mode_id }` | Builds a league from a real Yahoo league |
| `create-espn` | `{ season, leagueId, espnS2, SWID, mode_id }` | Same, from ESPN (cookie auth) |
| `import-lineup` | `{ season, currentWeek, leagueId }` | Pulls a week's real lineups |
| `import-schedule` | `{ season, currentWeek, leagueId }` | Pulls the real matchup schedule |
| `mapYahooKeys` | `{ access_token, refresh_token }` | Maps Yahoo player keys onto `nfl_players` |
| `auth-handler` | — | Yahoo OAuth redirect handler |

All are `POST`, all take `Authorization: Bearer <anon key>`.

---

## Setup

```bash
cp .env.example .env && $EDITOR .env
supabase start                  # local stack
supabase functions serve        # all functions, hot-reloaded
```

Apply the schema first — see [`db/README.md`](../../db/README.md).

Call one:

```bash
curl -X POST http://127.0.0.1:54321/functions/v1/generate-teams \
  -H "Authorization: Bearer $SUPABASE_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{"season": 2025, "teamCount": 6, "mode_id": 2}'
```

Or open [`api-tests/`](../../api-tests/README.md) in Bruno, which has a saved
request per function against local, fantasy and pointzone.

---

## Deploy

Secrets are set per project, not read from `.env`:

```bash
supabase secrets set --project-ref lwhqqyhgosxxoejskwfu \
  OPENAI_API_KEY=... YAHOO_CLIENT_ID=... YAHOO_CLIENT_SECRET=... YAHOO_REDIRECT_URI=...
```

Then deploy the functions you changed:

```bash
supabase functions deploy generate-teams        --project-ref lwhqqyhgosxxoejskwfu
supabase functions deploy run-draft             --project-ref lwhqqyhgosxxoejskwfu
supabase functions deploy run-weekly-management --project-ref lwhqqyhgosxxoejskwfu
```

`SUPABASE_URL`, `SUPABASE_ANON_KEY` and `SUPABASE_SERVICE_ROLE_KEY` are injected
by the platform — don't set those as secrets.

---

## Regenerating DB types

`_shared/supabase.ts` is generated. After a schema change:

```bash
supabase gen types typescript --project-ref lwhqqyhgosxxoejskwfu --schema fantasy \
  > supabase/functions/_shared/supabase.ts
```

---

## Notes

- CORS is `Access-Control-Allow-Origin: *` in every function. Fine for a
  prototype; tighten before anything real.
- `schemas/fantasy.schema.sql` is a snapshot. `db/` is the source of truth.
- `test-socket` and `draft-pick/deno.json` are leftovers from experiments.
