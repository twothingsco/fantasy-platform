// supabase/functions/run-weekly-management/index.ts
import { getRunGameWeekGraph } from './WeekGraph.ts'; // Direct import of the main WeekGraph
import { broadcastTeamUpdate,  getChannelName, setLeagueId  } from '../_shared/realtimeService.ts';
import { FantasyFootballState } from '../_shared/GraphState_types.ts'; // Import the main state type

console.info('Run Weekly Management Edge Function started.');

addEventListener('beforeunload', (ev) => {
    console.log('[RunWeeklyManagement] Function will be shutdown due to', ev.detail?.reason);
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
        // Expected inputs for weekly management
       const { season, currentWeek, leagueId = 1 } = await req.json();

        // Basic input validation
        if (typeof season !== 'number' || typeof currentWeek !== 'number' || typeof leagueId !== 'number') {
            // await broadcastTeamUpdate('error', { message: 'Invalid input: missing or incorrect parameters for draft setup.' });
            return new Response(JSON.stringify({ error: 'Invalid input parameters.' }), {
                status: 400,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
        }
        setLeagueId(leagueId); // Set the league ID for broadcast channel
        const channelName = await getChannelName();
        console.log(`[RunWeeklyManagement] Received request for Week ${currentWeek}: Season ${season}, LeagueId ${leagueId}`);
        await broadcastTeamUpdate('status', {
            message: `Initiating Weekly Management for Season ${season}, Week ${currentWeek}.`,
            progress: 0,
        });

        // Initialize the graph state for the weekly management
        const initialGraphState: typeof FantasyFootballState.State = {
            current_season: season,
            current_week: currentWeek,
            league_id: leagueId
        };

        const weeklyManagementExecutionPromise = getRunGameWeekGraph(initialGraphState); // Compile the weekly management graph

        // Start the weekly management process in the background
        const results = await weeklyManagementExecutionPromise
        // weeklyManagementExecutionPromise 
            .then((finalState) => {
                // console.log('[RunWeeklyManagement] Weekly management process completed successfully. Final State:', JSON.stringify(finalState));
                // The final state will contain the updated team rosters (with submitted lineups)
                // and potentially updated scores if WeekGraph computes them.
                broadcastTeamUpdate('data', { payload: finalState.team_roster || {} }); // Send final rosters
                broadcastTeamUpdate('status', { message: 'Weekly management finalized!', progress: 100 });
            })
            .catch(async (error) => {
                console.error('[RunWeeklyManagement] Weekly management process failed:', error);
                broadcastTeamUpdate('error', {
                    message: `Weekly management failed: ${error.message || 'An unexpected error occurred.'}`,
                    error: error.message,
                });
            });

        // EdgeRuntime.waitUntil(weeklyManagementExecutionPromise); // Keep function alive
// 
        return new Response(JSON.stringify({
            channelName: channelName,
            message: 'Weekly management process initiated. Updates will be broadcast via Realtime.',
            function_id: Deno.env.get('FUNCTION_NAME') || 'run-weekly-management',
        }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 202, // 202 Accepted
        });

    } catch (error) {
        console.error('[RunWeeklyManagement] Error in main handler:', error);
        await broadcastTeamUpdate('error', {
            message: `Failed to initiate weekly management: ${error.message || 'An unexpected error occurred.'}`,
            error: error.message,
        });
        return new Response(JSON.stringify({ error: error.message || 'An unexpected error occurred.' }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }
});