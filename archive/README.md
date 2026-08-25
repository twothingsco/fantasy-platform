# archive

Superseded code. Nothing here runs as part of the platform. It's kept because
both pieces answer "why is it built this way?" for something still in use.

Neither has a working `.env` — they were stripped on the way in. If you need to
run one, rebuild it from [`../.env.example`](../.env.example).

---

## `simulator/` — the original backend

An Express + TypeScript + **LangGraph** service. This is where the whole thing
started, and `apps/sim-edge` is a direct port of it to Supabase Edge Functions.

```
src/
├── app.ts
├── routes/           HTTP layer — draftRouter, status, createReport
├── graph/            LangGraph state machines
│   ├── leagueSetupGraph.ts   ─┐
│   ├── draftGraph.ts          │ became the *Graph.ts files in sim-edge
│   ├── weekGraph.ts          ─┘
│   ├── fantasyGameCoordinator.ts
│   └── GraphState_types.ts
└── services/         leagueManagment, scorring, nflData, scheduleGenerator
```

Reading this makes `sim-edge` legible. The `FantasyFootballState` object passed
between graph nodes, and the stage-by-stage progress broadcasts, are both
inherited from here — `sim-edge` kept the shape but dropped the LangGraph
dependency, since edge functions can't hold a long-lived graph runtime.

**`sim-edge` is ahead.** Same-named files have diverged (`scorringServices.ts`
is 85 lines here vs 113 there). Don't copy code back without diffing.

---

## `importer/` — the CSV-era stat loader

How `match_players` got filled before Genius Sports. Node scripts that read
season CSVs off disk — `importWeekData.js` has a hardcoded
`DATA_BASE_PATH = '/Users/travis/work/twothings/NFL-Data/NFL-data-Players'` —
parse them, and upsert into Supabase.

```bash
node --env-file=.env.fantasy importWeekData 2024 3
```

Replaced by [`apps/genius-feed`](../apps/genius-feed/README.md), which pulls the
same data from an API and can do it live.

Still useful for one thing: **backfilling historical seasons**. Genius Sports
gives you the current season; the CSVs go back further. If you want 2023 data in
the database, this is the path — point `DATA_BASE_PATH` at the data and run it.

Also here: `importDraft.ts`, `importWeeklyLineup.ts`, `csvParser.ts`,
`nflDataServices.ts`, and `importWeekData-orig.js` (an earlier draft of the
same script).

---

## Not carried over

Left behind in the old `fantasy-data/` directory, worth knowing existed:

| | |
|---|---|
| `yahooOAuth/` | Standalone Yahoo OAuth playground with self-signed certs. Its logic now lives in `sim-edge/_shared/yahooAuth.ts` and `create-yahoo/`. |
| `espn-import/` | One-off ESPN player dump. Superseded by `create-espn/`. |
| `testSupabase/` | Connection scratch. |
| `csv-converter-app/` | Draft-CSV converter. |
| `DRAFT/` | Draft and lineup CSVs for 2024 — real data, not code. |
| `NFL-Data-main.zip` | 17MB of season CSVs — the input `importer/` expects. |

The CSVs and the zip are data, not source. If you want them versioned, they
belong somewhere other than a git repo.
