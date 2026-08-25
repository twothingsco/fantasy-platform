import { Router, Request, Response } from 'express';
import {start } from '../graph/gameCoordinator'; // Import the start function from gameCoordinator

/**
 * Draft router for handling draft-related routes
 * This router can be extended to include more draft-related functionality
 * @param broadcastMessage - Function to broadcast messages (if needed)
 */

export default function createDraftRouter(broadcastMessage: (message: any) => void) {
    // This function can be used to create a draft router with additional functionality
    const draftRouter: Router = Router();

    draftRouter.post('/', (req: Request, res: Response) => {
        const body = req.body;
        console.log('Draft request received:', body);
        const season = body.seasonYear || '2023';
        const teamCount = body.numTeams || 10; 
        const current_week = body.currentWeek || 0; // Default to week 0 if not provided

        res.send({success: true, message: 'Draft initiated'});
        broadcastMessage({type: 'status', message: 'Draft initiated', progress:'1'});
        start(season, teamCount, current_week, broadcastMessage).then(results => {
                    broadcastMessage({type: 'status', message: 'Weekly Process Complete', progress:'100'});
                })
                .catch(error => {
                    console.error('Error creating report:', error);
                    broadcastMessage({type: 'status', message: 'Failed to create draft: ' + error, progress:'100'});
                });

    });

    return draftRouter;
}
