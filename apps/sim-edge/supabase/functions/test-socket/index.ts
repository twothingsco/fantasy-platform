// supabase/functions/run-draft/index.ts
import { broadcastTeamUpdate } from '../_shared/realtimeService.ts';
import {yo} from 'npm:yoo-hoo';

console.info('Run Draft Edge Function started.');

// This event listener is for general function lifecycle monitoring, not critical for core logic
addEventListener('beforeunload', (ev) => {
    console.log('[RunDraft] Function will be shutdown due to', ev.detail?.reason);
});

Deno.serve(async (req: Request) => {
    const corsHeaders = {
        'Access-Control-Allow-Origin': '*', // IMPORTANT: Restrict this in production
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
        const { season, currentWeek =0 , leagueId = 1 } = await req.json();

        // Basic input validation
        if (typeof season !== 'number' || typeof currentWeek !== 'number' || typeof leagueId !== 'number') {
            await broadcastTeamUpdate('error', { message: 'Invalid input: missing or incorrect parameters for draft setup.' });
            return new Response(JSON.stringify({ error: 'Invalid input parameters.' }), {
                status: 400,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
        }

        console.log(`[RunDraft] Received request to run draft: Season ${season}`);
        await broadcastTeamUpdate('status', {
            message: `Starting Fantasy Football Draft for Season ${season}.`,
            progress: 0,
        });
      
        // Initialize the graph state
        const initialGraphState: typeof FantasyFootballState.State = {
            season_year: season,
            current_week: currentWeek,
            league_id: leagueId,

        };
        // Here we can run our tests. 
        await broadcastTeamUpdate('status', {
            message: `Starting Fantasy Football TEST ${season}.`,
            progress: 0,
        });
        const header = yo('FANTASY');
        for (const index in header )
        {
            const line = header[index];
            console.log(line);
             await broadcastTeamUpdate('status', {
                message: line,
                progress: 0,
            });
        }
       

        // Return an immediate response indicating the draft has started
        return new Response(JSON.stringify({
            message: 'Draft process initiated. Updates will be broadcast via Realtime.',
            function_id: Deno.env.get('FUNCTION_NAME') || 'run-draft', // Example to return function ID
        }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 202, // 202 Accepted
        });

    } catch (error) {
        console.error('[RunDraft] Error in main handler:', error);
        await broadcastTeamUpdate('error', {
            message: `Failed to initiate draft: ${error.message || 'An unexpected error occurred.'}`,
            error: error.message,
        });
        return new Response(JSON.stringify({ error: error.message || 'An unexpected error occurred.' }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }
});