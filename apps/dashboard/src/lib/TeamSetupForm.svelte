<script lang="ts">
    import { createEventDispatcher } from 'svelte';

    const dispatch = createEventDispatcher();

    export let seasonYear: string;
    export let numTeams: string;
    export let currentWeek: string;
    export let responseMessage: { text: string; isError: boolean; visible: boolean };

    function handleSubmit(): void {
        // Input validation and conversion to number
        const seasonYearNum = parseInt(seasonYear);
        const numTeamsNum = parseInt(numTeams);
        const currentWeekNum = parseInt(currentWeek);

        if (isNaN(seasonYearNum) || isNaN(numTeamsNum) || isNaN(currentWeekNum)) {
            // Update the responseMessage prop directly, as it's passed down from the parent
            responseMessage.text = 'Please enter valid numbers for all fields.';
            responseMessage.isError = true;
            responseMessage.visible = true;
            setTimeout(() => {
                responseMessage.visible = false;
            }, 5000); // Hide after 5 seconds
            return;
        }
        dispatch('submitForm', { seasonYear, numTeams, currentWeek });
    }
</script>

<form on:submit|preventDefault={handleSubmit} class="space-y-4">
    <div class="grid grid-cols-3 gap-4">
        <div class="form-group">
            <label for="seasonYear" class="text-sm">Season Year:</label>
            <input type="number" id="seasonYear" name="seasonYear" placeholder="e.g., 2025" required
                   bind:value={seasonYear}
                   class="mt-1 focus:ring-blue-500 focus:border-blue-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md">
        </div>
        <div class="form-group">
            <label for="numTeams" class="text-sm">Number of Teams:</label>
            <input type="number" id="numTeams" name="numTeams" placeholder="e.g., 10" required min="1"
                   bind:value={numTeams}
                   class="mt-1 focus:ring-blue-500 focus:border-blue-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md">
        </div>
        <div class="form-group">
            <label for="currentWeek" class="text-sm">Current Week:</label>
            <input type="number" id="currentWeek" name="currentWeek" placeholder="e.g., 1" required min="0"
                   bind:value={currentWeek}
                   class="mt-1 focus:ring-blue-500 focus:border-blue-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md">
        </div>
    </div>
    <button type="submit"
            class="py-2.5 px-4 rounded-md text-white font-semibold shadow-md hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
        Start Team Setup
    </button>
</form>

{#if responseMessage.visible}
    <div class="message-box text-sm {responseMessage.isError ? 'bg-red-100 text-red-800' : 'bg-blue-100 text-blue-800'}">
        {responseMessage.text}
    </div>
{/if}

<style>
    /* Re-include relevant form-related styles from your original App.svelte */
    .form-group label {
        display: block;
        margin-bottom: 0.5rem;
        font-weight: 600;
        color: #334155;
    }
    .form-group input {
        width: 100%;
        padding: 0.75rem;
        border: 1px solid #cbd5e1;
        border-radius: 8px;
        font-size: 1rem;
        color: #475569;
        transition: border-color 0.2s ease-in-out, box-shadow 0.2s ease-in-out;
    }
    .form-group input:focus {
        outline: none;
        border-color: #3b82f6;
        box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.25);
    }
    button {
        width: 100%;
        padding: 0.85rem;
        background: linear-gradient(to right, #3b82f6, #2563eb);
        color: white;
        border: none;
        border-radius: 8px;
        font-size: 1.1rem;
        font-weight: 700;
        cursor: pointer;
        transition: background-color 0.2s ease-in-out, transform 0.1s ease-in-out;
        box-shadow: 0 4px 10px rgba(0, 0, 0, 0.1);
    }
    button:hover {
        background: linear-gradient(to right, #2563eb, #1d4ed8);
        transform: translateY(-1px);
    }
    button:active {
        transform: translateY(0);
        box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1);
    }
    .message-box {
        padding: 0.75rem 1.25rem;
        border-radius: 0.5rem;
        margin-top: 1rem;
        font-weight: 500;
    }
</style>