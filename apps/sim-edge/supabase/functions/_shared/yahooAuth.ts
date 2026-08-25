import YahooFantasy from 'npm:yahoo-fantasy';

const tokens = {} as { access_token: string; refresh_token: string };
// Initialize the API wrapper with your client ID, secret, and the saved tokens
console.log(`Initializing YahooFantasy API wrapper... ${Deno.env.get('YAHOO_CLIENT_ID')}`);
const yf = new YahooFantasy(
  Deno.env.get('YAHOO_CLIENT_ID') as string,
  Deno.env.get('YAHOO_CLIENT_SECRET') as string,
    () => {},
  Deno.env.get('YAHOO_REDIRECT_URI') as string
);

// await refreshPromise;
async function refreshYahooToken(): Promise<{ refresh_token: string }> {
    return new Promise((resolve, reject) => {
        const refreshCallback = function(error, data) {
            if (error) {
                console.error('Error refreshing token:', error);
                reject(error);
            } else {
                console.log('refresh call back data : ', data);
                console.log('Token refreshed successfully:', data.access_token);
                tokens.access_token = data.access_token;
                yf.setUserToken(data.access_token);
                console.log('Set new access token in YahooFantasy instance.', yf.yahooUserToken);
                resolve(data.access_token);
            }
        };
        yf.refreshToken(refreshCallback);
    });
};


export async function getYahooFantasy (refresh_token: string) {
    if (!refresh_token) {
        throw new Error('No refresh token provided for Yahoo Fantasy API.');
    }   
    yf.setRefreshToken(refresh_token);
    console.log('Refreshing Yahoo token...');
    const token = await refreshYahooToken();
    tokens.refresh_token = refresh_token || token.refresh_token;
    tokens.access_token = token.access_token;
    return yf;
}

export function getTokens() {
    return tokens;
}