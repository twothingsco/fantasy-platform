import { Router, Request, Response } from 'express';

const router: Router = Router();

/**
 * @route GET /status
 * @description Responds with the application status
 */
router.get('/', (req: Request, res: Response) => {
    res.status(200).json({ status: 'alive' });
});

export default router;