import {getAPIData} from './auth.ts'
import {MatchPlayerUpsert, STAT_MAP, ParticipantStats} from './StatsTypes.ts'
import { supabase } from './supabaseClient.ts';

const SCHEMA = 'public'; // Change this to your desired schema name

export function mapOffensivePlayerStats(gameData: any, gameWeekId: number, teamPlayerIdMap: Map<number, number>): MatchPlayerUpsert[] {
    const { statistics } = gameData;
    const playerStats: { [key: number]: MatchPlayerUpsert } = {};

    // Keys for core offensive stats to check for participation
    const coreOffensiveKeys = [
        'passesSucceededYards', 'rushingYards', 'receptions', 'passesTargetedAt'
    ];

    // Helper to get a stat value for a player, defaulting to 0
    const getStatValue = (statName: string, playerId: number): number => {
        const stat = statistics[statName];
        if (stat && stat.participants && stat.participants[playerId]) {
            return stat.participants[playerId].value as number;
        }
        return 0;
    };

    // 1. Identify all players who recorded any relevant offensive stat
    const relevantPlayerIds = new Set<number>();
    coreOffensiveKeys.forEach(statKey => {
        const stat = statistics[statKey];
        if (stat && stat.participants) {
            Object.keys(stat.participants).forEach(id => {
                const playerId = parseInt(id);
                const value = stat.participants[playerId].value;
                // Only consider the player if the value is non-zero (or negative, e.g., sack/rushing yards)
                if (value !== 0) {
                    relevantPlayerIds.add(playerId);
                }
            });
        }
    });


    // Initialize player stats only for players who have recorded a stat
    relevantPlayerIds.forEach(playerId => {
        const dbId = teamPlayerIdMap.get(playerId) || 0; // Default to 0 if not found
        if (dbId === 0) {
            console.warn(`No OFFENSE DB ID found for NFL Player ID ${playerId}`);
        }

        console.log(`Mapping NFL Player ID ${playerId} to DB ID ${dbId}`);
        playerStats[playerId] = { nfl_player_id: dbId, game_week_id: gameWeekId };
    });

    // 2. Process all offensive stat mappings for identified players
    const allOffensiveStatKeys = [
        'passesSucceededYards', 'touchdownsPasses', 'twoPointPassSucceeded',
        'passesIntercepted', 'rushes', 'rushingYards', 'touchdownsRushing',
        'receptions', 'receptionsYards', 'touchdownsReceptions', 'twoPointReceptionSucceeded',
        'passesSacked', 'fumblesLost', 'passesTargetedAt'
    ];

    for (const statKey of allOffensiveStatKeys) {
        const dbColumn = STAT_MAP[statKey] || statKey;

        for (const playerId of relevantPlayerIds) {
            const value = getStatValue(statKey, playerId);
            
            if (value !== 0) {
                 if (statKey === 'rushes') {
                    playerStats[playerId]['touch_carries'] = value;
                    playerStats[playerId]['touches'] = (playerStats[playerId]['touches'] || 0) + value;
                } else if (statKey === 'receptions') {
                    playerStats[playerId]['receiving_receptions'] = value;
                    playerStats[playerId]['touch_receptions'] = value;
                    playerStats[playerId]['targets_receptions'] = value;
                    playerStats[playerId]['touches'] = (playerStats[playerId]['touches'] || 0) + value;
                } else if (statKey === 'passesTargetedAt') {
                    playerStats[playerId]['targets'] = value;
                    // Calculate reception_percentage
                    const receptions = playerStats[playerId]['receiving_receptions'] || 0;
                    if (value > 0) {
                        playerStats[playerId]['reception_percentage'] = parseFloat(((receptions / value) * 100).toFixed(2));
                    }
                } else if (statKey === 'passesSucceededYards') {
                    playerStats[playerId]['passing_yards'] = value;
                } else if (statKey === 'touchdownsPasses') {
                    playerStats[playerId]['passing_tds'] = value;
                } else if (statKey === 'passesIntercepted') {
                    playerStats[playerId]['interceptions_thrown'] = value;
                } else {
                    playerStats[playerId][dbColumn] = value;
                }
            }
        }
    }
    const filteredPlayers = Object.values(playerStats).filter(
        player => player.nfl_player_id !== 0
    );
    return Object.values(filteredPlayers);

}

export function mapKickerPlayerStats(gameData: any, gameWeekId: number, teamPlayerIdMap: Map<number, number>): MatchPlayerUpsert[] {
    const { statistics } = gameData;
    
    // Keys for core kicking stats to check for participation
    const kickerStatKeys = ['extraPointsAttempted', 'fieldGoalsAttempted', 'extraPointsSucceeded', 'fieldGoalsSucceeded'];
    
    // Aggregate stats by player ID
    const kickerStats: MatchPlayerUpsert[] = [];
    const aggregatedStats: { [key: number]: MatchPlayerUpsert } = {};

    // Helper to get a stat value for a player, defaulting to 0
    const getStatValue = (statName: string, playerId: number): number => {
        const stat = statistics[statName];
        if (stat && stat.participants && stat.participants[playerId]) {
            return stat.participants[playerId].value as number;
        }
        return 0;
    };

    // 1. Identify all players who recorded any relevant kicker stat
    const relevantPlayerIds = new Set<number>();
    kickerStatKeys.forEach(statKey => {
        const stat = statistics[statKey];
        if (stat && stat.participants) {
            Object.keys(stat.participants).forEach(id => {
                const playerId = parseInt(id);
                // Assume any participant in these sections is a kicker/punter and gets a record
                if (stat.participants[playerId].value !== 0) {
                    relevantPlayerIds.add(playerId);
                }
            });
        }
    });
    
    // 2. Process stats only for identified kickers
    for (const playerId of Array.from(relevantPlayerIds)) {
        const dbId = teamPlayerIdMap.get(playerId) || 0; // Default to 0 if not found
        console.log(`KICKER Mapping PLAYER ID ${playerId} to DB Player ID ${dbId}`);
         if (dbId === 0) {
            console.warn(`No KICKER DB ID found for NFL Player ID ${playerId}`);
        }
        const playerObj: MatchPlayerUpsert = { nfl_player_id: dbId, game_week_id: gameWeekId };

        const patMade = getStatValue('extraPointsSucceeded', playerId);
        const patAttempted = getStatValue('extraPointsAttempted', playerId);
        const fgMade = getStatValue('fieldGoalsSucceeded', playerId);
        const fgAttempted = getStatValue('fieldGoalsAttempted', playerId);
        const fgYards = getStatValue('fieldGoalsYards', playerId);
        const fieldGoalsMissed = getStatValue('fieldGoalsMissed', playerId);
        // Map PAT stats
        if (patAttempted > 0) {
            playerObj.pat_made = patMade;
            playerObj.pat_missed = patAttempted - patMade;
        }

        // Map FG stats (using simplified mapping due to lack of range data)
        if (fgAttempted > 0) {
            //fieldGoalsYards / (field goals missed + field goals made)
            const fgMadeAverage = fgYards/(fgMade);
            // console.log(`FIELD GOAL Total Yards: ${fgYards} AVERAGE:${fgMadeAverage} Made: ${fgMade}`)
            // Since no yardage breakdown, map to a generic placeholder column
            switch (true){
                case fgMadeAverage >= 0 && fgMadeAverage <=19:
                    playerObj.fg_made_0_19=fgMade;
                    playerObj.fg_miss_0_19=fieldGoalsMissed;
                    break;
                case fgMadeAverage >= 20 && fgMadeAverage <=29:
                    playerObj.fg_made_20_29=fgMade;
                    playerObj.fg_miss_20_29=fieldGoalsMissed;
                    break;
                case fgMadeAverage >= 30 && fgMadeAverage <=39:
                    playerObj.fg_made_30_39=fgMade;
                    playerObj.fg_miss_30_39=fieldGoalsMissed;
                    break;  
                case fgMadeAverage >= 40 && fgMadeAverage <=49:
                    playerObj.fg_made_40_49=fgMade;
                    break;   
                 case fgMadeAverage >= 50:
                    playerObj.fg_made_50_plus=fgMade;
                    break;    
            }
            
            if (fieldGoalsMissed > 0) {
                
                playerObj.fg_miss_30_39=fieldGoalsMissed;
            }

            

            // playerObj.fg_made_50_plus = fgMade; 
            // playerObj.fg_miss_30_39 = fgAttempted - fgMade; 
        }

        kickerStats.push(playerObj);
    }
    const filteredPlayers = Object.values(kickerStats).filter(
        player => player.nfl_player_id !== 0
    );
    return Object.values(filteredPlayers);
}


// Helper to sum individual participant stats for a given team
const sumParticipantStatForTeam = (gameData: any, statKey: string, teamId: number): number => {
    const statBlock = gameData.statistics[statKey];
    if (!statBlock || !statBlock.participants) {
        return 0;
    }

    // Get a list of all player IDs associated with the specific team
    const teamPlayerIds = new Set(gameData.participants
        .filter((p: any) => p.competitorId === teamId)
        .map((p: any) => p.id.toString())
    );

    let sum = 0;
    for (const playerId in statBlock.participants) {
        if (teamPlayerIds.has(playerId)) {
            sum += statBlock.participants[playerId].value as number;
        }
    }
    return sum;
};

// --- FINAL UPDATED D/ST FUNCTION ---

export function mapTeamDefensiveStats(gameData: any, gameWeekId: number, teamPlayerIdMap: Map<number, number>): MatchPlayerUpsert[] {
    const { statistics, competitors } = gameData;
    const teamRecords: MatchPlayerUpsert[] = [];
    const competitorIds = competitors.map((c: any) => c.id);
    
    // Helper to get competitor stats
    const getCompetitorStatValue = (stats: any, statName: string, teamId: number): number => {
        const stat = stats[statName];
        if (stat && stat.competitors && stat.competitors[teamId]) {
            return stat.competitors[teamId].value as number;
        }
        return 0;
    };

    for (const teamId of competitorIds) {
        const dstPlayerId = teamPlayerIdMap.get(teamId) || 0; 
         if (dstPlayerId === 0) {
            console.warn(`No DEFENSE DB ID found for NFL Player ID ${dstPlayerId}`);
        }
        console.log(`DEFENSE Mapping Team ID ${teamId} to D/ST Player ID ${dstPlayerId}`);
        const teamRecord: MatchPlayerUpsert = { 
            nfl_player_id: dstPlayerId, 
            game_week_id: gameWeekId
        };

        // Directly Mapped Competitor Stats (Team Totals)
        teamRecord.points_conceded = parseFloat(getCompetitorStatValue(statistics, 'pointsAllowed', teamId).toFixed(2));
    
        teamRecord.defense_touchdowns = getCompetitorStatValue(statistics, 'touchdownsReturns', teamId);
   
        teamRecord.safeties = getCompetitorStatValue(statistics, 'safeties', teamId);
        teamRecord.sacks_made = getCompetitorStatValue(statistics, 'sacks', teamId);
        teamRecord.interceptions_caught = getCompetitorStatValue(statistics, 'interceptions', teamId);
        teamRecord.fumbles_won = getCompetitorStatValue(statistics, 'fumblesRecoveriesFromOpponents', teamId);
        teamRecord.tackles_for_loss = getCompetitorStatValue(statistics, 'tacklesForLoss', teamId);
        teamRecord.interception_return_yards = getCompetitorStatValue(statistics, 'interceptionsReturnsYards', teamId);
        teamRecord.fumble_return_yards = getCompetitorStatValue(statistics, 'fumblesReturnsYards', teamId);
        teamRecord.tackles_total = getCompetitorStatValue(statistics, 'tackles', teamId);
        teamRecord.tackles_assisted = getCompetitorStatValue(statistics, 'tacklesAssisted', teamId);

        // Calculated Team Totals (By Summing Participants for the team)
        teamRecord.forced_fumbles = sumParticipantStatForTeam(gameData, 'fumblesForced', teamId);
        teamRecord.passes_defended = sumParticipantStatForTeam(gameData, 'passesDefended', teamId);
        teamRecord.qb_hits = sumParticipantStatForTeam(gameData, 'quarterbackHits', teamId);
        
        // Blocked Kicks (Manual aggregation of team totals)
        const blockedKicks = getCompetitorStatValue(statistics, 'defensiveExtraPointsBlocked', teamId) +
                             getCompetitorStatValue(statistics, 'defensiveFieldGoalsBlocked', teamId) +
                             getCompetitorStatValue(statistics, 'defensivePuntsBlocked', teamId);
        teamRecord.blocked_kicks = blockedKicks;

        // FIND THE YARDS AGAINST 
        const otherTeamId = competitorIds.find(id => id !== teamId);
        if (otherTeamId) {
            teamRecord.yards_allowed = getCompetitorStatValue(statistics, 'offenseYards', otherTeamId as number);
        } 

        teamRecords.push(teamRecord);
    }

    return teamRecords;
}

export async function saveMatchPlayer (matchPlayers: MatchPlayerUpsert[]){
    console.log(`Attempting to insert/update ${matchPlayers.length} records into match_players.`);
    // console.log (matchPlayers);
    const { error: insertMpError } = await supabase
        .schema(SCHEMA)
        .from('match_players')
        .upsert(matchPlayers, { onConflict: 'game_week_id,nfl_player_id' });

    if (insertMpError) {
        console.error(`Error inserting/updating records into match_players:`, insertMpError.message);
        console.log(matchPlayers);
        // Optionally, you could choose to exit here or log and continue to the next file
    } else {
        console.log(`Successfully inserted/updated ${matchPlayers.length} records.`);
    }
} 

export async function getStats(currentWeekId: number, gameId: number, playerIdMap: Map<number, number>){
    console.log("STARTING getting team Stats", gameId);
    const url = `https://statistics.api.geniussports.com/v2/sports/17/fixtures/${gameId}?page=1&pageSize=100`;
    const {data, error} = await getAPIData(url);
    if (error) {
        console.error(error);
        return;
    }
    // Process the data as needed
    if (data ){
        const offensivePlayerUpsertData = mapOffensivePlayerStats(data, currentWeekId, playerIdMap);
        console.log("Offensive Player Upsert Data:", offensivePlayerUpsertData.length);
         const kickerPlayerUpsertData = mapKickerPlayerStats(data, currentWeekId, playerIdMap);
         console.log("Kicker Player Upsert Data:", kickerPlayerUpsertData.length);
        const defensiveAndTeamStatsUpsertData = mapTeamDefensiveStats(data, currentWeekId, playerIdMap);
        console.log("Defensive/Team Player Upsert Data:", defensiveAndTeamStatsUpsertData.length);
        const combinedStats = [...offensivePlayerUpsertData, ...kickerPlayerUpsertData, ...defensiveAndTeamStatsUpsertData];
        console.log("Combined Player Upsert Data:", combinedStats.length);
        return combinedStats;
    }
}

export function processStats ( currentWeekId: number, playerIdMap: Map<number, number>, data : any ){
    if (data ){
        const offensivePlayerUpsertData = mapOffensivePlayerStats(data, currentWeekId, playerIdMap);
        console.log("Offensive Player Upsert Data:", offensivePlayerUpsertData.length);
         const kickerPlayerUpsertData = mapKickerPlayerStats(data, currentWeekId, playerIdMap);
         console.log("Kicker Player Upsert Data:", kickerPlayerUpsertData.length);
        const defensiveAndTeamStatsUpsertData = mapTeamDefensiveStats(data, currentWeekId, playerIdMap);
        console.log("Defensive/Team Player Upsert Data:", defensiveAndTeamStatsUpsertData.length);
        const combinedStats = [...offensivePlayerUpsertData, ...kickerPlayerUpsertData, ...defensiveAndTeamStatsUpsertData];
        console.log("Combined Player Upsert Data:", combinedStats.length);
        return combinedStats;
    }
    return {};
}
