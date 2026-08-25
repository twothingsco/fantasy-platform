# api-tests

A [Bruno](https://usebruno.com) collection — 37 saved requests covering every
edge function, plus the raw Yahoo/ESPN/NFL endpoints the importers wrap.

Until the dashboard grows up, this is how you actually drive the platform.

---

## Setup

```bash
cp .env.example .env && $EDITOR .env
```

Then open this directory in Bruno (**Open Collection**) and select the
**supabase** environment.

Anon keys are no longer stored in the request files. They resolve through
`environments/supabase.bru` → `{{process.env.FANTASY_ANON_KEY}}` → the
gitignored `.env`. Both are *anon* keys (public by design), but they stay out of
git anyway.

---

## How it's organised

There's no folder structure — the naming carries it. The prefix is the target:

| Prefix | Target |
|---|---|
| `local …` / `Local …` | `http://127.0.0.1:54321` — the local Supabase stack |
| `Fantasy …` | `lwhqqyhgosxxoejskwfu` |
| `PointZone …` / `test …` | `fmzupmsctelynwgjmlnz` |
| `ESPN API …`, `YAHOO …`, `NFL.com …` | The upstream provider APIs, unwrapped |

So `local run Draft`, `Fantasy Run Draft` and `PointZone Run Draft` are the same
call against the three environments.

---

## A full local run

With `supabase start` and `supabase functions serve` going in
[`../apps/sim-edge`](../apps/sim-edge/README.md):

1. **`leagueSetup copy`** → `generate-teams` — creates the league and its teams
2. **`local run Draft`** → `run-draft` — drafts every roster
3. **`leagueSetup`** → `run-weekly-management` — runs a week

Then repeat step 3, bumping `currentWeek`, to walk the season.

For a league built from a real one, start with **`Yahoo Local`**
(`create-yahoo`) or **`ESPN Local`** (`create-espn`) instead of step 1, then
**`local import Schedule`** and **`local import Lineups`**.

Yahoo needs a token first: **`local yahoo auth`** → **`YahooRefresh Token`**.

---

## Provider requests

`ESPN API …`, `YAHOO NFL PLAYERS`, `Yahoo Player Stats` and `NFL.com PLayers`
hit the upstream APIs directly, with no Supabase in the way. They're for working
out response shapes before changing `ESPNService.ts` / `YahooService.ts` in
`sim-edge`. Handy when a provider quietly changes a field.

---

## Gotchas

These are mislabelled in the collection — the names lie about the endpoint:

| Request | Actually calls |
|---|---|
| `Fantasy IMPORT Schedule` | `import-lineup`, not `import-schedule` |
| `local import Schedule` | `import-lineup`, not `import-schedule` |
| `leagueSetup` | `run-weekly-management`, not `generate-teams` |

Also: several requests are `… copy` duplicates with different bodies, and the
`leagueId` values in saved bodies point at leagues that exist in *those*
databases — expect to change them.

Two unrelated IPTV requests (`ABC`, `impro`) were dropped when this moved into
the monorepo; one had a username and password in the URL.
