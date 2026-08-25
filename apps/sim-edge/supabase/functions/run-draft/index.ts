// supabase/functions/run-draft/index.ts
import { runDraftSubGraph } from './DraftGraph.ts'; // Renamed from LeagueSetupGraph
import { broadcastTeamUpdate, getChannelName, setLeagueId } from '../_shared/realtimeService.ts';
import { FantasyFootballState } from '../_shared/GraphState_types.ts'; // Import DraftState

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
            // await broadcastTeamUpdate('error', { message: 'Invalid input: missing or incorrect parameters for draft setup.' });
            return new Response(JSON.stringify({ error: 'Invalid input parameters.' }), {
                status: 400,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
        }

        console.log(`[RunDraft] Received request to run draft: Season ${season}`);
        setLeagueId(leagueId); // Set the league ID for broadcast channel
        const channelName = await getChannelName();
        // Initialize the graph state
        const initialGraphState: typeof FantasyFootballState.State = {
            current_season: season,
            current_week: currentWeek,
            league_id: leagueId,

        };

        const draftExecutionPromise =  runDraftSubGraph(initialGraphState)

        const results = await draftExecutionPromise
        // draftExecutionPromise
            .then((finalState) => {
                //console.log('[RunDraft] Draft process completed successfully. Final State:', JSON.stringify(finalState));
                // Send a final data update with the complete rosters
                //console.log('[RunDraft] Draft process completed successfully.');
                // broadcastTeamUpdate('status', {
                //     message: `Finalizing Draft for Season ${season}.`,
                //     progress: 100,
                // });
            })
            .catch(async (error) => {
                console.error('[RunDraft] Draft process failed:', error);
                 await broadcastTeamUpdate('info', {
                    type: 'error',
                    message: `Draft process failed: ${error.message || 'An unexpected error occurred.'}`,
                    error: error.message,
                });
            });
        
        

    //    EdgeRuntime.waitUntil(draftExecutionPromise); // Keep function alive until draft completes

        // Return an immediate response indicating the draft has started
        return new Response(JSON.stringify({
            channelName: channelName,
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