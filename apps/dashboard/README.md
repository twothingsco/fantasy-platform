# dashboard

A SvelteKit operator UI for driving `sim-edge` and watching it work.

**Status: early and incomplete.** It predates most of `sim-edge` and only covers
league setup. Everything else in the platform is driven from
[`api-tests/`](../../api-tests/README.md) or curl. Treat this as a starting
point, not a finished app.

---

## What it does today

One screen — `TeamSetupDashboard`:

1. You enter season, team count, and current week.
2. It POSTs to the `generate-teams` edge function.
3. It subscribes to the Supabase Realtime channel `team_data_update` and renders
   progress live as the function works.

That last part is the interesting bit, and the reason this app exists: it proves
the `realtimeService` broadcast pattern in `sim-edge` end to end.

The edge functions broadcast three events on that channel:

| Event | Payload | Rendered by |
|---|---|---|
| `status` | `{ message, progress }` | `StatusDisplay` — message log + progress bar |
| `info` | `{ message }` | `StatusDisplay` |
| `team_data` | `{ team_roster }` | `TeamRostersDisplay` — roster table per team |

---

## Components

```
src/
├── routes/+page.svelte          renders TeamSetupDashboard, nothing else
└── lib/
    ├── TeamSetupDashboard.svelte  the container — Supabase client, Realtime
    │                              subscription, edge-function call
    ├── TeamSetupForm.svelte       season / team count / week inputs
    ├── StatusDisplay.svelte       progress bar + scrolling message log
    ├── TeamRostersDisplay.svelte  roster table
    └── testCSS.svelte             Tailwind scratch — not used
```

---

## Setup

```bash
cp .env.example .env.development && $EDITOR .env.development
npm install
npm run dev
```

`VITE_` variables are inlined into the browser bundle. Only ever put the **anon**
key here — never `service_role`.

| Variable | |
|---|---|
| `VITE_SUPABASE_URL` | `http://127.0.0.1:54321` locally |
| `VITE_SUPABASE_ANON_KEY` | anon key, matching that project |
| `VITE_EXPRESS_PORT` | legacy — from when the backend was `archive/simulator` |

You need `supabase start` and `supabase functions serve` running in
[`../sim-edge`](../sim-edge/README.md) for anything to happen.

---

## Notes

- `package.json` is still configured as a **Svelte library** (`svelte-package`,
  `publint`, `exports`) from the `npx sv create` template. It's an app. Worth
  fixing if you pick this up.
- Tailwind v4 via `@tailwindcss/vite`.
- `VITE_EXPRESS_PORT` is a leftover from the Express prototype and isn't used for
  anything meaningful now.
