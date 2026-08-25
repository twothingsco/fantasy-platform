// supabase/functions/generate-teams/realtimeService.ts
import { supabase } from './supabaseClient.ts'; // Use npm: specifier with version
import { generateKey } from './channelKeys.ts'; // Import the key generation function

const FANTASY_SCHEMA = 'public';
const CHANNEL_NAME = 'team_data_update';
// Supabase Realtime channel for broadcasting. This is handled internally by the client.
let channelName: string | null; // = CHANNEL_NAME ;
let leagueId: number | null = null;

export const setLeagueId = (id: number) => {
  leagueId = id;
};

export const setChannelName = (name: string) => {
  channelName = name;
};

/**
 * Fetches the broadcast channel name from the 'fantasy.league_settings' table
 * and caches it.
 * @returns The broadcast channel name, or null if not found.
 */
export const getChannelName = async (): Promise<string | null> => {
  // If the channel name is already cached, return it immediately.
  if (channelName) {
    return channelName;
  }

  if (!leagueId){
    //get the generate a channel key
    const tempName =  generateKey();
    setChannelName(tempName);
    console.log(`No leagueId set, using temporary channel name: ${tempName}`);
    return tempName;
  }
  try {
    // Query the database to get the broadcast channel name.
    const { data, error } = await supabase
      .schema(FANTASY_SCHEMA)
      .from('league_settings')
      .select('broadcast_channel')
      .eq('league_id', leagueId)
      .single(); // We expect a single row.

    if (error) {
      console.error('Error fetching channel name:', error.message);
      return null;
    }

    if (data && data.broadcast_channel) {
      // Cache the fetched channel name.
      channelName = data.broadcast_channel;
      console.log(`Channel name fetched and cached: ${channelName}`);
      return channelName;
    }

    // Handle case where data is returned but broadcast_channel is null or undefined.
    console.warn('Broadcast channel not found in fantasy.league_settings.');
    return null;

  } catch (error) {
    console.error('Unexpected error fetching channel name:', error);
    return null;
  }
};

/**
 * Sends a broadcast message to all subscribed clients on the game channel.
 * @param eventName A custom event name to categorize messages (e.g., 'status', 'info', 'data').
 * @param payload The data to send with the message.
 */
export const broadcastTeamUpdate = async (eventName: string, payload: any) => {
    try {
        const channel_name = await getChannelName();
        // Using the Supabase client's channel method to send a broadcast.
        await supabase.channel(channel_name ? channel_name : CHANNEL_NAME).send({
            type: 'broadcast',
            event: eventName,
            payload: payload
        });
        console.log(`[${channel_name}]:Broadcasting event: ${eventName}, Payload: ${JSON.stringify(payload)}`);
    } catch (error) {
        console.error('Error broadcasting message:', error);
    }
};