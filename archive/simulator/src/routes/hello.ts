import { Router, Request, Response } from 'express';

const router: Router = Router();

/**
 * @route GET /hello
 * @description Responds with "Hello World!"
 */
router.get('/', (req: Request, res: Response) => {
    res.send('Hello World!');
});

export default router;