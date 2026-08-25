// supabase/functions/generate-teams/index.ts
import { mapAndSaveAllYahooPlayers } from './YahooService.ts';
import { broadcastTeamUpdate, getChannelName } from '../_shared/realtimeService.ts';

console.info('Generate Teams Edge Function started.');

addEventListener('beforeunload', (ev) => {
  console.log('Function will be shutdown due to', ev.detail?.reason)
})

Deno.serve(async (req: Request) => {
    const corsHeaders = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-client-info, apikey',
        'Connection': 'keep-alive',
    };

    if (req.method === 'OPTIONS') {
        return new Response(null, { status: 204, headers: corsHeaders });
    }

    if (req.method !== 'POST') {
        return new Response(JSON.stringify({ error: 'Method Not Allowed' }), {
            status: 405,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }

    try {
        const {  access_token, refresh_token } = await req.json();

       
        const channelName = await getChannelName();
        console.log(`Received request to Map YAHOO  Players `);
        // await broadcastTeamUpdate('status', {
        //     message: `Initalizing....`,
        //     progress: 0
        // });

        const generationPromise =  mapAndSaveAllYahooPlayers(access_token, refresh_token); // Call the function to generate teams

        // --- ADD THESE .then() and .catch() blocks ---
       const results = await generationPromise
    //    generationPromise
            .then((results) => {
                console.log('[Edge Function] generationPromise resolved successfully.');
                return results;
                // You might send a final success broadcast here if not already done in LeagueSetupGraph
                // e.g., broadcastTeamUpdate('info', { message: 'Background generation task finished.' });
            })
            .catch((error) => {
                console.error('[Edge Function] generationPromise rejected with error:', error);
                // Send an error broadcast if not already done in LeagueSetupGraph
                // e.g., broadcastTeamUpdate('error', { message: `Background generation task failed: ${error.message}` });
            });
        // ---------------------------------------------

        // EdgeRuntime.waitUntil(generationPromise); // Non-blocking, keeps the function alive for this promise

        return new Response(JSON.stringify({
            channelName: channelName,
            message: 'ESPN Team generation process initiated. Updates will be broadcast via Realtime.',
            data: results
        }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 202,
        });

    } catch (error) {
        console.error('Error in create-espn Edge Function (outer catch):', error);
        await broadcastTeamUpdate('error', {
            message: 'ESPN Team generation initiation failed!', // Changed message to differentiate from background task failure
            error: error.message
        });
        return new Response(JSON.stringify({ error: error.message || 'An unexpected error occurred.' }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }
});