import { Router, Request, Response } from 'express';

const router = Router();

// Health check endpoint for groups API (basic status check)
router.get('/health/check', (req: Request, res: Response) => {
    res.status(200).json({
        success: true,
        message: 'Groups API is running',
        timestamp: new Date().toISOString(),
        note: 'Routes will be added as needed'
    });
});

export default router;