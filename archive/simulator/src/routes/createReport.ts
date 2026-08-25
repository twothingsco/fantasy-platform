import { Router, Request, Response } from 'express';
import {createReport} from '../graph/index'; 
import { marked } from 'marked';

const router: Router = Router();

/**
 * @route GET /report
 * @description Responds with report from the graph"
 */
router.get('/:topic', (req: Request, res: Response) => {
    const topic = req.params.topic;
    createReport(topic)
        .then(report => {
            const htmlContent = marked(report);
            res.set('Content-Type', 'text/html');
            res.send(htmlContent);
            
        })
        .catch(error => {
            console.error('Error creating report:', error);
            res.status(500).json({ error: 'Failed to create report' });
        });
});

export default router;