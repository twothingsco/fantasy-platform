import { geniusStats } from './config.ts';
// --- 1. TYPE DEFINITIONS ---

interface AuthRequestBody {
  client_id: string;
  client_secret: string;
  audience: string;
  grant_type: string;
}

interface AuthTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number; // Time in seconds until expiration
}

// Structure for the data we will cache locally in memory
interface CachedToken {
  accessToken: string;
  expiresAt: number; // Unix timestamp (milliseconds) when the token expires
}

// --- 2. CONFIGURATION & IN-MEMORY CACHE ---

const AUTH_URL = 'https://auth.geniussports.com/oauth/token';

const authData: AuthRequestBody = {
  client_id: geniusStats.clientId,
  client_secret: geniusStats.clientSecret,
  audience: 'https://api.geniussports.com',
  grant_type: 'client_credentials'
};

// This variable holds the token and its expiration time for the current session.
// It is initialized to null and is module-scoped (private to this file).
let tokenCache: CachedToken | null = null;

// --- 3. CORE LOGIC ---

/**
 * Checks the in-memory cache for a valid, non-expired token.
 * @returns {string | null} The access token or null if expired/not found.
 */
function getCachedToken(): string | null {
  if (!tokenCache) {
    console.log('❌ Cache is empty. Must fetch new token.');
    return null;
  }
  
  // Check if the token is still valid (give a 60-second buffer)
  const now = Date.now();
  // We use a 60-second buffer to ensure the token doesn't expire *during* an API call
  const isExpired = tokenCache.expiresAt < (now + 60000); 

  if (!isExpired) {
    // console.log('✅ Found valid token in memory cache. Returning cached token.');
    return tokenCache.accessToken;
  } else {
    console.log('⏳ Cached token is expired. Will fetch a new one.');
    // Clear the cache to ensure a fresh fetch
    tokenCache = null; 
    return null;
  }
}

/**
 * Fetches a new access token and updates the in-memory cache.
 * @returns {Promise<string>} The new access token.
 * @throws {Error} if the request fails.
 */
async function fetchNewToken(): Promise<string> {
  console.log('🚀 Fetching a new access token...');
  
  const response = await fetch(AUTH_URL, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
    },
    body: JSON.stringify(authData)
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`HTTP error! Status: ${response.status}, Body: ${errorText}`);
  }

  const tokenResponse: AuthTokenResponse = await response.json();
  
  // Calculate the absolute expiration time (in milliseconds)
  const expiresAt = Date.now() + (tokenResponse.expires_in * 1000);

  // Update the module-scoped cache variable
  tokenCache = {
    accessToken: tokenResponse.access_token,
    expiresAt: expiresAt,
  };
  
  console.log('✨ Successfully fetched and cached new token in memory.');
  return tokenResponse.access_token;
}

// --- 4. EXPORTED MAIN FUNCTION ---

/**
 * Gets the current access token, either from a valid in-memory cache or by fetching a new one.
 * * This function should be imported and used by other parts of your Deno application.
 * @returns {Promise<string | null>} The valid access token or null if fetching failed.
 */
export async function getAccessToken(): Promise<string | null> {
  try {
    // 1. Try to get a valid token from the cache first (synchronous check)
    let token = getCachedToken();

    // 2. If the cached token is null (expired or not found), fetch a new one
    if (token === null) {
      token = await fetchNewToken();
    }
    
    return token;

  } catch (error) {
    console.error('FATAL: Could not retrieve an access token.', error);
    return null; // Return null on complete failure
  }
}

export async function getAPIData (url: string){ 
    const token = await getAccessToken();
    const options = {
    method: 'GET',
    headers: {
        'content-type': 'application/json',
        'x-api-key': geniusStats.apiKey,
        authorization: `Bearer ${token}`
    }
    };

    try {
    const response = await fetch(url, options);
    if (!response.ok) {
        // Read the error body text for better debugging
        const errorBody = await response.text(); 
        throw new Error(`HTTP error! Status: ${response.status}, Body: ${errorBody}`);
    }

    // 3. Status is 2xx, safely parse JSON
    const data = await response.json();
    return { data: data , error: null };

    } catch (error) {
    //console.error(error);
    return {data: null, error:error}
    }
}