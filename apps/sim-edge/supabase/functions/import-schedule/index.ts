// supabase/functions/generate-teams/index.ts
import { broadcastTeamUpdate, getChannelName } from '../_shared/realtimeService.ts';
import { importSchedule } from './ScheduleService.ts';

console.info('Import Lineup Edge Function started.');

addEventListener('beforeunload', (ev: any) => {
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
        const { season, currentWeek =1 , leagueId = 1 } = await req.json();

        if (typeof season !== 'number' || typeof currentWeek !== 'number' || typeof leagueId !== 'number') {
            // await broadcastTeamUpdate('error', { message: 'Invalid input: season and teamCount must be numbers.' });
            return new Response(JSON.stringify({ error: 'Invalid input parameters. season, currentWeek, and leagueId must be numbers.' }), {
                status: 400,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
        }
        const channelName = await getChannelName();
        console.log(`Received request to generate Lineups for : Season ${season}, League ${leagueId}`);
        // await broadcastTeamUpdate('status', {
        //     message: `Initalizing....`,
        //     progress: 0
        // });

        const generationPromise =  importSchedule(leagueId, season, currentWeek); // Call the function to generate teams

        // --- ADD THESE .then() and .catch() blocks ---
    //    const results = await generationPromise
       generationPromise
            .then(() => {
                console.log('[Edge Function] generationPromise resolved successfully.');
                //return results;
                // You might send a final success broadcast here if not already done in LeagueSetupGraph
                // e.g., broadcastTeamUpdate('info', { message: 'Background generation task finished.' });
            })
            .catch((error) => {
                console.error('[Edge Function] generationPromise rejected with error:', error);
                // Send an error broadcast if not already done in LeagueSetupGraph
                // e.g., broadcastTeamUpdate('error', { message: `Background generation task failed: ${error.message}` });
            });
        // ---------------------------------------------

        EdgeRuntime.waitUntil(generationPromise); // Non-blocking, keeps the function alive for this promise

        return new Response(JSON.stringify({
            channelName: channelName,
            message: 'Lineup generation process initiated. Updates will be broadcast via Realtime.',
        }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 202,
        });

    } catch (error: {message?: string} | any) {
        console.error('Error in import-lineup Edge Function (outer catch):', error);
        await broadcastTeamUpdate('error', {
            message: 'Import Lineup generation initiation failed!', // Changed message to differentiate from background task failure
            error: error.message
        });
        return new Response(JSON.stringify({ error: error.message || 'An unexpected error occurred.' }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }
});