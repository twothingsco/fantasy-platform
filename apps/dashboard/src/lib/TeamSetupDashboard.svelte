<script lang="ts">
    import { onMount } from 'svelte';
    import TeamSetupForm from '$lib/TeamSetupForm.svelte';
    import StatusDisplay from '$lib/StatusDisplay.svelte';
    import TeamRostersDisplay from '$lib/TeamRostersDisplay.svelte';

    // --- Supabase Imports and Initialization ---
    import { createClient } from '@supabase/supabase-js';

    // Access environment variables
    const SUPABASE_URL: string = import.meta.env.VITE_SUPABASE_URL as string;
    const SUPABASE_ANON_KEY: string = import.meta.env.VITE_SUPABASE_ANON_KEY as string;
    const expressPort: number = parseInt(import.meta.env.VITE_EXPRESS_PORT as string);

    // Ensure the variables are actually loaded
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY || isNaN(expressPort)) {
        console.log(`Environment Variables:
        SUPABASE_URL: ${SUPABASE_URL}
        SUPABASE_ANON_KEY: ${SUPABASE_ANON_KEY}
        EXPRESS_PORT: ${expressPort}`);
        console.error('Environment variables for Supabase or Express port are not loaded correctly.');
        // Optionally, throw an error or display a message to the user
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    // ------------------------------------------

    // Form input states
    let seasonYear: string = '';
    let numTeams: string = '';
    let currentWeek: string = '';

    // Define interfaces for structured data
    interface StatusMessage {
        type: 'success' | 'error' | 'info' | 'default';
        text: string;
    }

    interface Player {
        player_id: number;
        player_name: string;
        nfl_team_name: string;
        position_type: string;
        game_week_id: number;
        scoring_mode: string;
        fantasy_score: number;
    }

    interface TeamRosterRecord {
        [teamName: string]: Player[];
    }

    // States for StatusDisplay
    let statusMessages: StatusMessage[] = [{ type: 'default', text: 'Initializing Supabase Realtime...' }];
    let progress: number = 0; // 0-100 for progress bar

    // State for TeamSetupForm's response message
    let responseMessage: { text: string; isError: boolean; visible: boolean } = { text: '', isError: false, visible: false };

    // State for TeamRostersDisplay
    let teamsData: TeamRosterRecord | null = null;

    let channel: any = null; // To hold the Supabase Realtime channel instance

    function setupSupabaseRealtime(): void {
    addStatusMessage({ type: 'info', text: 'Subscribing to Realtime changes...' });

    channel = supabase.channel('team_data_update')
        .on('broadcast', { event: 'status' }, (payload) => {
            const data = payload.payload;
            addStatusMessage({ type: 'default', text: data.message });
            progress = data.progress;
           
        })
        .on('broadcast', { event: 'info' }, (payload) => {
            const data = payload.payload;
            addStatusMessage({ type: 'info',  text: data.message });
          
        })
        .on ('broadcast', {event: 'team_data'}, (payload)=> {
            const data = payload.payload;
            const receivedPayload: TeamRosterRecord = data.team_roster;
            console.log('Recieved a team roster update ',receivedPayload )
            if (receivedPayload && typeof receivedPayload === 'object' && Object.keys(receivedPayload).length > 0) {
                teamsData = receivedPayload;
                
            } else {
                teamsData = null;
                console.warn('Received team_data_update but payload is empty or not an object:', receivedPayload);
            }
            console.log('Updared Teandata ',teamsData );
            
        })
        // Add this wildcard listener for debugging 🚀
        .on('broadcast', { event: '*' }, (payload) => {
            // This will catch ALL broadcast events on 'team_data_update'
            // The `payload.event` will tell you the specific event name.
            console.log('--- Debug Broadcast Received ---');
            console.log('Event:', payload.event);
            console.log('Payload:', payload.payload);
            console.log('------------------------------');

            // addStatusMessage({
            //     type: 'info', // You might want to define a 'debug' type in your addStatusMessage
            //     text: `DEBUG: Event "${payload.event}" received: ${JSON.stringify(payload.payload)}`
            // });
        })
        .subscribe((status) => {
            if (status === 'SUBSCRIBED') {
                addStatusMessage({ type: 'success', text: 'Supabase Realtime Subscribed! Ready for updates.' });
                console.log('Supabase Realtime subscription established.');
            } else if (status === 'CHANNEL_ERROR') {
                addStatusMessage({ type: 'error', text: 'Supabase Realtime Channel Error. Retrying...' });
                console.error('Supabase Realtime Channel Error.');
            } else if (status === 'TIMED_OUT') {
                addStatusMessage({ type: 'error', text: 'Supabase Realtime Timed Out. Retrying...' });
                console.error('Supabase Realtime Timed Out.');
            }
        });
    }

    onMount(() => {
        setupSupabaseRealtime();
        return () => {
            if (channel) {
                supabase.removeChannel(channel);
                console.log('Supabase Realtime channel removed.');
            }
        };
    });

    async function handleFormSubmit(event: CustomEvent<{ seasonYear: string; numTeams: string; currentWeek: string }>): Promise<void> {
        const { seasonYear: submittedSeasonYear, numTeams: submittedNumTeams, currentWeek: submittedCurrentWeek } = event.detail;

        statusMessages = [];
        progress = 0;
        teamsData = null;
        responseMessage.visible = false;

        try {
            const response = await fetch(`http://localhost:${expressPort}/draft`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    seasonYear: submittedSeasonYear,
                    numTeams: submittedNumTeams,
                    currentWeek: submittedCurrentWeek
                }),
            });

            const data: { message?: string } = await response.json();

            if (response.ok) {
                showResponseMessage(data.message || 'Draft initiation successful!', false);
                console.log('Form submission successful:', data.message);
            } else {
                showResponseMessage(`Error: ${data.message || response.statusText}`, true);
                console.error('Form submission failed:', data.message || response.statusText);
            }
        } catch (error) {
            showResponseMessage('An error occurred during form submission. Check network and server.', true);
            console.error('Network or server error:', error);
        }
    }

    function addStatusMessage(message: StatusMessage): void {
        const maxMessages = 50;
        statusMessages = [...statusMessages.slice(Math.max(0, statusMessages.length - maxMessages + 1)), message];
    }

    function showResponseMessage(message: string, isError: boolean = false): void {
        responseMessage = { text: message, isError: isError, visible: true };
        setTimeout(() => {
            responseMessage.visible = false;
        }, 5000);
    }
</script>

<div class="container bg-white p-8 rounded-xl shadow-lg space-y-6">
    <h1 class="text-3xl font-extrabold text-center text-gray-800 mb-6">Team Setup Dashboard</h1>

    <TeamSetupForm
        bind:seasonYear
        bind:numTeams
        bind:currentWeek
        bind:responseMessage
        on:submitForm={handleFormSubmit}
    />

    <StatusDisplay
        bind:statusMessages
        bind:progress
    />

    <TeamRostersDisplay
        bind:teamsData
    />
</div>

<style>
    .container {
        background-color: #ffffff;
        padding: 2rem;
        border-radius: 12px;
        box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1);
        max-width: 900px;
        width: 100%;
    }
</style>