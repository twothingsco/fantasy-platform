// Central credential loader for the two Genius Sports products this app talks to.
//
//   Statistics API v2  -> auth.ts          (fixtures, teams, players, post-game stats)
//   MatchState API     -> auth-matchState.ts (live feed handshake, Ably channel token)
//
// They are separate Genius products with separate client credentials and API keys.
// Values live in .env.local / .env.fantasy — see .env.example.

function required(name: string): string {
  const value = Deno.env.get(name);
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export const geniusStats = {
  clientId: required('GENIUS_STATS_CLIENT_ID'),
  clientSecret: required('GENIUS_STATS_CLIENT_SECRET'),
  apiKey: required('GENIUS_STATS_API_KEY'),
};

export const geniusMatchState = {
  clientId: required('GENIUS_MATCHSTATE_CLIENT_ID'),
  clientSecret: required('GENIUS_MATCHSTATE_CLIENT_SECRET'),
  apiKey: required('GENIUS_MATCHSTATE_API_KEY'),
};
