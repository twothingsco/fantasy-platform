<script lang="ts">
    // Import the slide transition from Svelte
    import { slide } from 'svelte/transition';

    // Define interfaces for structured data received or sent
    interface Player {
        player_id: number;
        player_name: string;
        nfl_team_name: string;
        position_type: string;
        game_week_id: number;
        scoring_mode: string;
        fantasy_score: number;
    }

    // This interface describes the Record object structure for teamsData
    interface TeamRosterRecord {
        [teamName: string]: Player[]; // Keys are team names (strings), values are arrays of Player objects
    }

    export let teamsData: TeamRosterRecord | null;

    // Use a reactive Svelte store or an object to manage the open state for each team
    // This allows each team's collapsible content to be managed independently.
    // We'll use a Map for better performance with dynamic keys.
    const openStates = new Map<string, boolean>();

    // Function to format table headers
    function formatHeader(text: string): string {
        return text.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase()).replace(/_/g, ' ');
    }

    // Function to toggle team section visibility
    function toggleTeamContent(teamName: string): void {
        // Toggle the state for the specific team
        // console.log('Click on ', teamName)
        // const currentOpenState = openStates.get(teamName) || false;
        // console.log(`Click on ${teamName} curretOpenState ${currentOpenState}`)
        // openStates.set(teamName, !currentOpenState);
        // console.log('OPenStates ', openStates)
        // We need to trigger a Svelte re-render for the map change to be reflected.
        // A simple way is to re-assign it or use a reactive declaration for specific keys if needed.
        // For simple toggling within an #each block, Svelte reactivity usually handles this.
        // If not, a trick like `openStates = openStates` or using a Svelte store would be necessary.
        // In this case, since `openStates.get(teamName)` is reactive, it usually works fine.
    }
</script>

{#if teamsData}
    <div id="teamDataOutput" class="team-data-output-container">
        <h2 class="text-xl font-bold text-gray-700 mb-3">Fantasy Team Rosters:</h2>
        {#each Object.entries(teamsData) as [teamName, players]}
            <div class="team-section">
                <div
                    class="team-header"
                    role="button"
                    tabindex="0"
                    on:click={() => toggleTeamContent(teamName)}
                    on:keydown={(e) => { if (e.key === 'Enter' || e.key === ' ') toggleTeamContent(teamName); }}
                >
                    <span>{teamName}</span>
                    <span class="toggle-icon">{openStates.get(teamName) ? '−' : '+'}</span>
                </div>

                {#if openStates.get(teamName)}
                    <div class="team-content" transition:slide>
                        {#if players.length > 0}
                            <table class="team-table">
                                <thead>
                                    <tr>
                                        {#each Object.keys(players[0] || {}) as headerText}
                                            <th>{formatHeader(headerText)}</th>
                                        {/each}
                                    </tr>
                                </thead>
                                <tbody>
                                    {#each players as player (player.player_id)}
                                        <tr>
                                            {#each Object.keys(player) as key}
                                                <td>{player[key as keyof Player]}</td>
                                            {/each}
                                        </tr>
                                    {/each}
                                </tbody>
                            </table>
                        {:else}
                            <p class="p-4 text-gray-500">No players in this team.</p>
                        {/if}
                    </div>
                {/if}
            </div>
        {/each}
    </div>
{/if}

<style>
    /* Remove 'display: none' and 'max-height' from .team-content */
    /* Svelte's slide transition handles the visibility and height */
    .team-data-output-container {
        margin-top: 2rem;
        background-color: #f8fafc;
        border: 1px solid #e2e8f0;
        border-radius: 8px;
        padding: 1rem;
    }
    .team-section {
        border: 1px solid #cbd5e1;
        border-radius: 8px;
        margin-bottom: 1rem;
        overflow: hidden; /* Important for containing transition content within rounded corners */
    }
    .team-header {
        background-color: #e2e8f0;
        padding: 0.75rem 1rem;
        font-size: 1.1rem;
        font-weight: 700;
        cursor: pointer;
        display: flex;
        justify-content: space-between;
        align-items: center;
    }
    .team-header:hover {
        background-color: #d1d8e0;
    }
    .team-content {
        /* These styles will apply when the content is visible. */
        /* `slide` transition manages the height and display property */
        padding: 1rem;
        background-color: #ffffff;
        /* Remove max-height and overflow-y: auto here, as slide handles height. */
        /* If you still need scrollability for very tall tables, you'd apply max-height/overflow-y to a *child* element within team-content. */
    }
    .team-table {
        width: 100%;
        border-collapse: collapse;
    }
    .team-table th, .team-table td {
        border: 1px solid #e2e8f0;
        padding: 0.6rem;
        text-align: left;
    }
    .team-table th {
        background-color: #f0f4f8;
        font-weight: 600;
        color: #334155;
        position: sticky;
        top: 0;
        z-index: 1;
    }
    .team-table tr:nth-child(even) {
        background-color: #f8fafc;
    }
    .team-table tr:hover {
        background-color: #edf2f7;
    }
</style>