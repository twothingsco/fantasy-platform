# genius-feed

Deno scripts that fill the database from Genius Sports: who the NFL players are,
what games are on this week, and what those players did in them — including
live, during the game.

`sim-edge` runs the fantasy game. This runs the real world underneath it.

---

## Two APIs, two sets of credentials

Genius Sports splits this across two products, and they authenticate separately.
Both are loaded through `src/config.ts`.

| Product | Auth endpoint | Wrapper | Used for |
|---|---|---|---|
| **Statistics API v2** | `auth.geniussports.com/oauth/token` | `src/auth.ts` | Fixtures, teams, players, completed-game stats |
| **MatchState API** | `auth.api.geniussports.com/oauth2/token` | `src/auth-matchState.ts` | The live-feed handshake that returns a per-fixture Ably channel + token |

Both wrappers cache their bearer token in memory until it expires.
`GENIUS_STATS_*` and `GENIUS_MATCHSTATE_*` are **not** interchangeable.

---

## Setup

```bash
cp .env.example .env.local && $EDITOR .env.local
```

Every script is run the same way — `--env-file` picks the target database, so
the same script fills local, fantasy or pointzone:

```bash
deno run --allow-all --env-file=.env.local <script> [args]
```

---

## Scripts, in the order you'd run them

### 1. Seed teams and players — once per season

```bash
deno run --allow-all --env-file=.env.local src/teams.ts
```

Pulls every team and its player contracts for the season, writes
`fullTeams.json`, then `PlayerSetup.ts` maps that onto `nfl_teams` and
`nfl_players`.

> The season ID is **hardcoded** at the bottom of `src/teams.ts`
> (`const season = 158559; // 2025 season Id`). Change it for a new season.

```bash
deno run --allow-all --env-file=.env.local src/PlayerSetup.ts
```

`PlayerSetup.ts` runs whichever block is uncommented at the bottom of the file —
save teams, save players, or update shirt numbers. Currently:
`updateShirtNumbers()`.

### 2. Load a week's fixtures

```bash
deno run --allow-all --env-file=.env.local src/loadNFLGames.ts 2025 1
#                                                              │    └ week
#                                                              └ season
```

Looks up the `game_weeks` row for that season/week, reads its `nfl_id` as the
Genius `roundId`, fetches the fixtures, and writes `nfl_games`.

### 3a. Pull stats after games finish

```bash
deno run --allow-all --env-file=.env.local src/testStats.ts 2025 1
```

Walks every game in the round, maps Genius stat keys onto your columns, and
upserts `match_players`. Despite the name this is the working batch importer.

### 3b. Or follow a game live

```bash
deno run --allow-all --env-file=.env.local src/genuisLiveStats.ts <gameWeekId> <fixtureId>
```

Asks MatchState for the fixture's Ably channel, subscribes, and writes stats as
they arrive. Two guards keep it sane:

- **15s debounce** — only the most recent message in a quiet period is processed,
  so a busy drive doesn't cause a write per event.
- **60s heartbeat timeout** — Genius sends heartbeats; if they stop, the script
  notices.

Genius marks stats `ISCONFIRMED` after review, so it's worth re-pulling with
`testStats.ts` ~30 minutes after a game ends to pick up corrections.

---

## Files

```
src/
├── config.ts             credential loader for both Genius products
├── auth.ts               Statistics API v2 auth + getAPIData()
├── auth-matchState.ts    MatchState API auth + getAPIData()
├── teams.ts              fetch teams/players for a season -> fullTeams.json
├── PlayerSetup.ts        fullTeams.json -> nfl_teams / nfl_players
├── loadNFLGames.ts       fixtures for a week -> nfl_games
├── stats.ts              Genius stat keys -> match_players (the mapping core)
├── StatsTypes.ts         MatchPlayerUpsert shape + STAT_MAP
├── testStats.ts          batch stat pull for a whole round
├── genuisLiveStats.ts    live Ably subscription for one fixture
├── playersPerTeam.ts     one team's contracts (ad-hoc lookup)
├── CleanUpPlayers.ts     filter ESPN/Yahoo player dumps to fantasy positions
├── supabaseClient.ts     service-role client
└── supabase.ts           generated DB types
```

Data files at the app root:

| File | Role |
|---|---|
| `fullTeams.json` | Current season teams + players, written by `teams.ts` |
| `fullTeams_OLD.json` | Previous season — still what `PlayerSetup.ts` imports |
| `nfl_teams_rows.json` | Exported `nfl_teams` rows, used to match Genius team IDs to yours |
| `weekMap.json` | NFL week number → Genius `roundId` |
| `weeks.json` | Full round listing from the API |
| `statsexample.json` | Captured API response, fixture for `testStats.ts` |
| `espn_players.json`, `yahoo_players.json` | Raw dumps, inputs to `CleanUpPlayers.ts` |

---

## Rough edges

- **Scripts run on import.** Most files do their work at module top level rather
  than behind a `main()`, so importing one executes it.
- **`PlayerSetup.ts` is comment-driven** — which step runs depends on what's
  uncommented at the bottom.
- **Hardcoded season ID** in `teams.ts`.
- **`teams.ts` fails `deno check`** — 5 pre-existing implicit-`any` parameters.
  It runs fine; the errors predate the monorepo move.
- `genuisLiveStats.ts` is spelled that way throughout. Left alone so imports keep
  working.
