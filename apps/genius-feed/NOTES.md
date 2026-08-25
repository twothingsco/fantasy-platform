# genius-feed scratch notes

Open questions and TODOs captured while building the Genius Sports feed.
Carried over verbatim — not all of it is still current.

## Open product questions

- **Projections** — where do they come from? Nothing produces them today.
- How do we model weekly projections, and win probability off them?
- Is the player's game actually being played this week?
- Player health status — not currently ingested.
- Third-party avatars.
- Matchup roster needs bench with position slots.
- Third-party matchup import.

## Ably / live feed

- Live access is requested per fixture; each fixture gets its own Ably channel.
- One SDK subscription per fixture — see `src/genuisLiveStats.ts`.
- Stats carry an `ISCONFIRMED` flag. Genius revises after review, so re-pull
  ~30 minutes after a game ends to pick up corrections.

## Original notes

```


Liniear tasks 

Where is projections ?? 

** How do we model weekly projections? 
    Win probability calculation 

Game playing that week.

Health Status of a player. 

** Third Party Avitar --

** Matchup Roster add bench with position slots. 

** Third Party Matchups import. 


24th Handoff of the prototype 



ABLY Setup 
Request live access to specific 
Each fixture has a ably chanel 
ABLY SDK Subscriptions per fixure. 

ISCONFIRMED - Stats 
30 minutes after the game pull again.


```
