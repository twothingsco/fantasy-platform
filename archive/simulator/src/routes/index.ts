import { Router } from 'express';
import helloRouter from './hello'; // Import the hello world router
import statusRouter from './status'; // Import the status router
import createReportRouter from './createReport'; // Import the create report router
import draftRouter from './draftRouter'; // Import the draft router


/**
 * Main router for the application
 * This router aggregates all individual routers and mounts them at specific paths
 * @param broadcastMessage - Function to broadcast messages (if needed)
 */

export default function createMainRouter(broadcastMessage: (message: string) => void) {
    // This function can be used to create a main router with additional functionality
    const mainRouter: Router = Router();

    // Mount individual routers
    // Routes will be accessible at /hello and /status
    mainRouter.use('/hello', helloRouter);
    mainRouter.use('/status', statusRouter);
    mainRouter.use('/report', createReportRouter); // Mount the create report router at /report
    mainRouter.use('/draft', draftRouter(broadcastMessage)); // Mount the draft router at /draft

    return mainRouter;
}

