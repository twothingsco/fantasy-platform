// Reexport your entry components here
import './app.css' // Or whatever your global CSS file is named
import TeamSetupDashboard from './TeamSetupDashboard.svelte'

const app = new TeamSetupDashboard({
    target: document.getElementById('app') as HTMLElement, // Type assertion for safety
})

export default app