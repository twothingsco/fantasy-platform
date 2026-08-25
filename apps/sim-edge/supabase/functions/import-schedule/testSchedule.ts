import { importSchedule } from './ScheduleService.ts';


const seasonYear = parseInt(Deno.args[0]);
const gameWeek = parseInt(Deno.args[1]);
const leagueId = parseInt(Deno.args[2]);


await importSchedule(leagueId, seasonYear, gameWeek); // Call the function to generate teams
