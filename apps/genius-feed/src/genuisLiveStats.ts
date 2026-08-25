import * as Ably from 'npm:ably';
import {getAPIData} from './auth.ts';
import {saveMatchPlayer, processStats} from './stats.ts'
import { supabase } from './supabaseClient.ts';



const SCHEMA = 'public'; // Change this to your desired schema name
let currentweekId: number;
const  playertoIdMap = await getPlayerIDMap();;
let fixtureId: number;
let latestMessage: string | null = null;
// The timer ID to manage the debounce delay.
// In Deno/TypeScript, setTimeout returns a number, which we'll use for clearTimeout.
let debounceTimer: number | null = null; 
const QUIET_PERIOD_MS = 15 * 1000; // 30 seconds

//Heartb eeat timeout
let heartbeatTimeout: number | null = null;
const HEARTBEAT_TIMEOUT_MS = 1 * 60000; // 1 minutes



const sourceId = "GeniusPremium";
const sportId = 17; // American Football
const matchstateUrl = "https://platform.matchstate.api.geniussports.com/api/v1";
const statsUrl = 'https://statistics.api.geniussports.com/v2';


/**
 * The function that runs when the quiet period is over.
 */
function processLatestMessage() {
    // 1. Process the latest message, which is guaranteed to be the last one received.
    if (latestMessage !== null) {
        const messageToProcess = latestMessage;
        
        // 2. CRITICAL: Clear the state BEFORE processing to avoid race conditions 
        // if a new message arrives mid-task.
        latestMessage = null; 
        debounceTimer = null; 

        console.log(`\n✅ [${new Date().toLocaleTimeString()}] QUIET PERIOD ENDED. Processing: ${messageToProcess}`);
        console.log('----------------------------------------------------');
        // Your heavy, time-consuming processing logic goes here.
        
        const stats = processStats(currentweekId, playertoIdMap, messageToProcess);
        if (stats) {
            console.log(`Processing stats for game ID: ${fixtureId} stats length: ${stats.length}`);
            saveMatchPlayer(stats);
        }
    }
}

function processHeartbeat() {
    console.log(`\n❤️ [${new Date().toLocaleTimeString()}] Heartbeat received. Resetting heartbeat timeout.`);
    
    // Clear the previous heartbeat timeout if it exists
    if (heartbeatTimeout !== null) {
        clearTimeout(heartbeatTimeout);
    }

    // Set a new heartbeat timeout
    heartbeatTimeout = setTimeout(() => {
        console.log(`⚠️ [${new Date().toLocaleTimeString()}] No heartbeat received for ${HEARTBEAT_TIMEOUT_MS / 60000} minutes. GAME OVER`);
        Deno.exit(1);
        // Here you can implement reconnection logic or alerting as needed.
    }, HEARTBEAT_TIMEOUT_MS);
}

/**
 * The message handler that implements the debounce logic.
 * This function should be called inside your websocket.onmessage event.
 */
function handleIncomingMessage(data: any) {
    // 1. Queue the new message (it overwrites any previous queued message)
    latestMessage = data;
    console.log(`➡️ [${new Date().toLocaleTimeString()}] Received/Queued: ${data}`);

    // 2. Clear the previous timer (reset the clock)
    if (debounceTimer !== null) {
        clearTimeout(debounceTimer);
        console.log('   (Timer reset due to new message)');
    }

    // 3. Start a new timer
    debounceTimer = setTimeout(processLatestMessage, QUIET_PERIOD_MS);
}

/**** 
** AUTH CALL BACK 
**/
type AblyAuthCallback = (
    tokenParams: Ably.TokenParams,
    callback: (error: Ably.ErrorInfo | null, tokenRequest: Ably.TokenDetails | Ably.TokenRequest) => void
) => void;

async function getPlayerIDMap(): Promise<Map<number, number>> {
    const playerIdMap = new Map<number, number>();

    try {
        const { data: playerData, error: playerError } = await supabase
            .schema(SCHEMA)
            .from('nfl_players')
            .select('id, nfl_id');

        if (playerError) {
            console.error('Error fetching player data:', playerError.message);
            throw playerError;
        }

        playerData.forEach((player: any) => {
            playerIdMap.set(parseInt(player.nfl_id), player.id);
        });
    } catch (error) {
        console.error('Failed to get player ID map. Aborting.', error);
        process.exit(1);
    }

    return playerIdMap;
}   


async function getSchedule (){

    const now: Date = new Date();
    // The toISOString() method returns a string in the ISO 8601 format: "YYYY-MM-DDTHH:mm:ss.sssZ"
    const from: string = now.toISOString();

    // To add two days, we calculate the milliseconds for two days (2 * 24 * 60 * 60 * 1000)
    // and add it to the current time's epoch milliseconds, then create a new Date.
    const twoDaysInMilliseconds: number = 2 * 24 * 60 * 60 * 1000;
    const toDate: Date = new Date(now.getTime() + twoDaysInMilliseconds);
    const to: string = toDate.toISOString();
    const scheduleURL = `${matchstateUrl}/sources/${sourceId}/sports/${sportId}/schedule?from=${from}&to=${to}`;
    console.log('Schedule URL: ', scheduleURL);
    const schedule = await getAPIData( scheduleURL );
    console.log(schedule);
}

async function getLiveFeedChannel(fixureId: number){
    const liveFeedURL = `${statsUrl}/sports/${sportId}/fixtures/${fixureId}/liveaccess`;
    console.log('Live Feed URL: ', liveFeedURL);
    const liveFeed = await getAPIData( liveFeedURL );
    console.log(liveFeed);
    return {
        ablyChannelName: liveFeed.data.channelName,
        ablyAccessToken: liveFeed.data.accessToken
    };
}

async function subscribeToLiveFeed(currentweekId: number , fixtureId: number) {
    const playertoIdMap = await getPlayerIDMap();
    // Initial call to get the channel name and the first token
    const { ablyChannelName, ablyAccessToken } = await getLiveFeedChannel(fixtureId);
    console.log(`Subscribing to Ably Channel: ${ablyChannelName} with initial token.`);
    // --- AuthCallback Implementation (Updated to reflect C# logic) ---
    const AblyAuthCallback: AblyAuthCallback = async (tokenParams, callback) => {
        console.log(`[Auth] Requesting new token (due to renewal/expiry). Token Params: ${JSON.stringify(tokenParams)}`);
        
        try {
            // This line implements the C# logic: (_, string accessToken) = await GetAblyFeed();
            // We call the same function that provides a fresh token.
            const { ablyChannelName, ablyAccessToken } = await getLiveFeedChannel(fixtureId);
            
            // This line implements the C# logic: return new TokenDetails { Token = accessToken };
            // const tokenDetails: Ably.TokenDetails = {
            //     token: ablyAccessToken
            // };
            
            // In the JS SDK, we provide the token result via the callback function.
            callback(null, ablyAccessToken);
        } catch (error) {
            console.error('[Auth] Error fetching new token:', error);
            // Pass the error back to Ably
            callback(error as Ably.ErrorInfo, null);
        }
    };

// --------------------------------------------------------------------------
// --- Main Ably Initialization and Subscription (Same as original but wrapped in async function) ---
// --------------------------------------------------------------------------
    console.log('Initializing Ably Realtime client...', ablyAccessToken);
    const ably = new Ably.Realtime({
        // // 1. Initial token: key: ablyAccessToken
        // key: '7WMb2fJXK0aoJlGE01tZJ3nVdsvVuTiw5DIP7nCB',
        token: ablyAccessToken,
        // 2. Renewal logic: authCallback: AblyAuthCallback
        authCallback: AblyAuthCallback, 

        environment: "geniussports",

        fallbackHosts: [
            "geniussports-a-fallback.ably-realtime.com",
            "geniussports-b-fallback.ably-realtime.com",
            "geniussports-c-fallback.ably-realtime.com",
            "geniussports-d-fallback.ably-realtime.com",
            "geniussports-e-fallback.ably-realtime.com"
        ]
    });

    const channelOptions: Ably.ChannelOptions = {
        params: {
          //  delta: 'vcdiff' // Enable VCDIFF delta compression
        }
    };
    //const channelName = `live-statistics:AmericanFootball:v1:${fixtureId}:GeniusPremium`;
    const channel = ably.channels.get(ablyChannelName, channelOptions);
    

    console.log(`\nAttempting to subscribe to channel: ${ablyChannelName} (Fixture ID: ${fixtureId})`);

    channel.subscribe((message: Ably.Message) => {

        // const decodedMessage = vcdiff.decode('vcdiff', message);
        // console.log(`[ABLY MESSAGE] Decoded Data: ${decodedMessage}`);
        //console.log(`[ABLY MESSAGE] Name: ${message.name} | Data: ${message.data}`);
        if ( message.name == 'stats'){
            const data = message.data;
            handleIncomingMessage(data);
            // const stats = processStats(currentweekId, playertoIdMap, data);
            // if (stats) {
            //     console.log(`Processing stats for game ID: ${fixtureId} stats length: ${stats.length}`);
            //     saveMatchPlayer(stats);
            // }
        } else if (message.name == 'heartbeat'){
            processHeartbeat()
        }
        
    });

    ably.connection.on('connected', () => {
        console.log('Ably connection established successfully. 🟢');
    });

    ably.connection.on('failed', (error) => {
        console.error('Ably connection failed! 🔴', error);
    });
}
const gameWeek  = Deno.args[0];
const gameId = Deno.args[1];
currentweekId = parseInt(gameWeek);
fixtureId = parseInt(gameId);


// getSchedule();
console.log(`STARTING WEEK: ${parseInt(gameWeek)}, GAME: parseInt(gameId)`);
subscribeToLiveFeed(parseInt(gameWeek), parseInt(gameId));
