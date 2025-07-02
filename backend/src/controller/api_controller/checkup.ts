import {Request, Response } from 'express';

export const pingControler = (req: Request, res: Response) => {
    res.status(200).json({
        message: 'Konnect Backend is running',
    });
}