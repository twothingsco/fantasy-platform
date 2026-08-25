<script lang="ts">
    export let statusMessages: { type: 'success' | 'error' | 'info' | 'default'; text: string }[];
    export let progress: number;

    // Auto-scroll status box to the bottom when new messages are added
    let statusOutputElement: HTMLElement;

    $: if (statusOutputElement) {
        statusOutputElement.scrollTop = statusOutputElement.scrollHeight;
    }
</script>

<div class="mt-6">
    <h2 class="text-xl font-bold text-gray-700 mb-3">Setup Status:</h2>
    <div class="progress-bar-container">
        <div id="progressBar" class="progress-bar" style="width: {progress}%; background-color: {progress === 100 ? '#10b981' : '#4f46e5'};"></div>
    </div>
    <div bind:this={statusOutputElement} id="statusOutput" class="status-box mt-3 text-sm text-gray-700">
        {#each statusMessages as message}
            <p class="status-message {message.type === 'success' ? 'text-green-600' : message.type === 'error' ? 'text-red-600' : message.type === 'info' ? 'text-gray-500 italic' : ''}">
                {message.text}
            </p>
        {/each}
    </div>
</div>

<style>
    /* Re-include relevant status display styles from your original App.svelte */
    .status-box {
        background-color: #f8fafc;
        border: 1px solid #e2e8f0;
        border-radius: 8px;
        padding: 1rem;
        max-height: 250px;
        overflow-y: auto;
        white-space: pre-wrap;
        word-break: break-word;
    }
    .status-message {
        color: #334155;
        margin-bottom: 0.5rem;
    }
    .progress-bar-container {
        width: 100%;
        background-color: #e0e7ff;
        border-radius: 9999px;
        height: 12px;
        overflow: hidden;
        margin-top: 1rem;
    }
    .progress-bar {
        height: 100%;
        width: 0%;
        background-color: #4f46e5;
        border-radius: 9999px;
        transition: width 0.4s ease-in-out;
    }
</style>