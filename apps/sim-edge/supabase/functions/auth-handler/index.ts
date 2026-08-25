// supabase/functions/auth-handler/index.ts
import YahooFantasy from 'npm:yahoo-fantasy';

// Access environment variables from Supabase Secrets
//Deno.env.get(
const YAHOO_CLIENT_ID = Deno.env.get('YAHOO_CLIENT_ID') as string;
const YAHOO_CLIENT_SECRET = Deno.env.get('YAHOO_CLIENT_SECRET') as string;
const YAHOO_REDIRECT_URI = Deno.env.get('YAHOO_REDIRECT_URI') as string;

// Initialize YahooFantasy client
const yf = new YahooFantasy(
  YAHOO_CLIENT_ID,
  YAHOO_CLIENT_SECRET,
  (accessToken: string, refreshToken: string) => {
    // This callback is for an Express app to handle token storage.
    // In a Deno Edge Function, we'll handle this differently.
    console.log("Token callback triggered, but not used in this way.");
  },
  YAHOO_REDIRECT_URI,
);

// Adapter function to translate Deno Request to Node.js-like object
const denoReqToNodeReq = (denoReq:Request) => {
  const url = new URL(denoReq.url);
  const query = {};

  // Populate the 'query' object with URLSearchParams
  for (const [key, value] of url.searchParams.entries()) {
    query[key] = value;
  }

  // Return a new object with the expected structure
  return {
    query: query,
    url: url.href,
    // Add any other properties the Node function might need
    // headers: Object.fromEntries(denoReq.headers.entries()),
    // method: denoReq.method,
  };
};

// Function to handle Yahoo OAuth authentication
async function auth() {

  const authData = {
    client_id: YAHOO_CLIENT_ID, // Replace with your key
    redirect_uri: YAHOO_REDIRECT_URI, // Replace with your redirect URI
    response_type: "code",
  };

  const authUrl = new URL("https://api.login.yahoo.com/oauth2/request_auth");
  authUrl.search = new URLSearchParams(authData).toString();

  try {
    const response = await fetch(authUrl.toString());
    console.log('Yahoo auth response status:', response.status);
    if (response.status === 302) {
      // Get the redirect URL from the Location header
      const redirectUrl = response.headers.get("Location");
      if (redirectUrl) {
        // Return a new Deno/Web API Response object for the redirect
        return new Response(null, {
          status: 302,
          headers: {
            Location: redirectUrl,
          },
        });
      }
    }
    

    // Handle other status codes or errors
    return new Response(null, {
          status: 302,
          headers: {
            Location: authUrl.toString(),
          },
        });
  } catch (e) {
    console.error(e);
    return new Response(`Error: ${e.message}`, { status: 500 });
  }
}

const handler = async (req: Request): Promise<Response> => {
  const url = new URL(req.url);
  console.log(' Handling path ', url.pathname);
  console.log (' YAHOO_REDIRECT_URI: ', YAHOO_REDIRECT_URI);
  console.log (' YAHOO_CLIENT_ID: ', YAHOO_CLIENT_ID);
  switch (url.pathname) {
    // Redirect to Yahoo for authentication
    case "/auth-handler/auth/yahoo":
      try {
        return await auth();
      } catch (err) {
        console.error("Authentication redirect failed:", err);
        return new Response("Authentication redirect failed.", { status: 500 });
      }

    // Handle the callback from Yahoo
    case "/auth-handler/auth/yahoo/callback":
      try {
        const denoReq = denoReqToNodeReq(req);
        const data = await new Promise((resolve, reject) => {
        yf.authCallback(denoReq, (error, data) => {
          if (error) {
            reject(error); // Reject the promise on error
          } else {
            resolve(data); // Resolve the promise with the successful data
          }
        });
      });

      console.log(`tokens: ${JSON.stringify(data)}`);
      return new Response(JSON.stringify(data), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
      } catch (err) {
        console.error("Authentication failed:", err);
        return new Response("Authentication failed.", { status: 500 });
      }

    default:
      return new Response("Not Found", { status: 404 });
  }
};

Deno.serve(handler);