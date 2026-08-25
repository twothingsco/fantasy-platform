<script lang="ts">
     // Function to toggle team section visibility
    function toggleTeamContent(event: MouseEvent): void {
        const header = event.currentTarget as HTMLElement;
        const content = header.nextElementSibling as HTMLElement | null;

        if (content) {
            // Toggle the 'active' class on the content element
            content.classList.toggle('active');

            // Update the toggle icon based on the 'active' class
            const toggleIcon = header.querySelector('.toggle-icon') as HTMLElement | null;
            if (toggleIcon) {
                toggleIcon.textContent = content.classList.contains('active') ? '−' : '+'; // Use '−' for minus, looks better
            }
        }
    }
</script>
<div class="p-4 max-w-sm mx-auto bg-white rounded-xl shadow-lg flex items-center space-x-4 mt-8">
  <div class="shrink-0">
    <svg class="h-12 w-12 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
    </svg>
  </div>
  <div>
    <div class="text-xl font-medium text-black">Tailwind CSS Test</div>
    <p class="text-gray-500">If this text is styled, Tailwind is working! 🎉</p>
  </div>
  <div class="team-header" role="button" tabindex="0" on:click={toggleTeamContent}>
                    <span>CLICK</span>
                    <span class="toggle-icon">+</span>
                </div>
  <div class ='team-content'> 
    THIS IS A Test
    </div>
</div>

<style>
  /* No Svelte-specific styles needed, Tailwind handles it */

      .team-content {
            display: none; /* Hidden by default, toggled by JS */
            padding: 1rem;
            background-color: #ffffff;
            max-height: 300px; /* Limit height for scrollability */
            overflow-y: auto;
        }
    .team-content.active {
        display: block;
    }
</style>