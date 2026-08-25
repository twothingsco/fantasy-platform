import 'dotenv/config'; // Load environment variables from .env file
import express, { Application, Request, Response } from 'express';
import cors from 'cors'; // Import CORS middleware for handling cross-origin requests
import mainRouter from './routes/index'; // Import the main router
import { WebSocketServer, WebSocket } from 'ws';
import * as http from 'http';
import * as path from 'path';

const app: Application = express();
// Ensure HTTP_PORT is explicitly converted to a number or remains as a number literal
const HTTP_PORT = parseInt(process.env.PORT || '3000', 10);
// Define the port for the WebSocket server
// Parse WS_PORT to a number, as process.env variables are strings.
const WS_PORT = parseInt(process.env.WS_PORT || '3001', 10);

// Create an HTTP server using the Express app
const server = http.createServer(app);

// Initialize WebSocket server attached to the HTTP server, or a separate port
// We'll run it on a separate port for clarity in this example.
const wss = new WebSocketServer({ port: WS_PORT });

// Configure CORS for your API endpoints during development
// In production, if served from the same domain, CORS might not be needed for direct API calls.
// But if Svelte is hosted separately (e.g., Netlify), you'll still need it.
app.use(cors({
    origin: 'http://localhost:5173' // Allow your Svelte dev server to access your API
}));

// Serve static files from the 'public' directory
// This line tells Express to serve files from the specified directory.
// When a request comes in that doesn't match a defined route (like '/setup-teams'),
// Express will look for a matching file in the 'public' directory.
// For example, accessing http://localhost:3000/ will serve public/index.html
app.use(express.static(path.join(__dirname, '../public')));

/**
 * Broadcasts a message to all connected WebSocket clients.
 * @param message The message object to send. It will be stringified to JSON.
 */
function broadcastMessage(message: any) {
    // Iterate over all connected clients
    console.log('Broadcasting message to all WebSocket clients:', wss.clients.size, 'clients connected', message);
    wss.clients.forEach((client: WebSocket) => {
        // Ensure the client is open before sending
        if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify(message));
        }
    });
    // console.log('Broadcasted:', message);
}
// Middleware to parse JSON bodies
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Use the main router for all API routes
// Any route defined in mainRouter will be prefixed with '/' (e.g., /hello, /status)
app.use('/', mainRouter(broadcastMessage));

// Basic error handling middleware (optional)
app.use((err: any, req: Request, res: Response, next: Function) => {
    console.error(err.stack);
    res.status(500).send('Something broke!');
});



// WebSocket server event handling
interface InfoMessage {
    type: 'info';
    message: string;
}

interface ClientMessage {
    // Define the expected structure of messages from clients if known
    // For now, allow any structure
    [key: string]: any;
}

wss.on('connection', (ws: WebSocket) => {
    console.log('Client connected to WebSocket.');
    const welcomeMessage: InfoMessage = { type: 'info', message: 'Welcome! Waiting for team setup requests...' };
    ws.send(JSON.stringify(welcomeMessage));

    ws.on('message', (message: string) => {
        console.log('Received message from client: %s', message);
        // You can add more logic here to handle messages from clients if needed
        // Example: const clientMsg: ClientMessage = JSON.parse(message);
    });

    ws.on('close', () => {
        console.log('Client disconnected from WebSocket.');
    });

    ws.on('error', (error: Error) => {
        console.error('WebSocket error:', error);
    });
});

// Start the HTTP server
server.listen(HTTP_PORT, () => {
    console.log(`Server running on http://localhost:${HTTP_PORT}`);
});


