import { Request, Response } from 'express';
import MessageModel from '../../models/message.model';

export const getOfflineMessagesController = async (req: Request, res: Response): Promise<void> => {
    try {
        const userId = req.user?.id;
        if (!userId) {
            res.status(401).json({ status: false, message: 'Authentication required.' });
            return;
        }

        // Find all messages for the user
        const messages = await MessageModel.find({ receiver: userId }).sort({ timestamp: 1 }).lean();

        if (messages.length > 0) {
            // Respond with the messages
            res.status(200).json({
                status: true,
                message: 'Offline messages retrieved.',
                data: messages,
            });

            // Asynchronously delete the messages that were just sent
            const messageIds = messages.map(m => m._id);
            MessageModel.deleteMany({ _id: { $in: messageIds } }).exec();

        } else {
            res.status(200).json({
                status: true,
                message: 'No offline messages found.',
                data: [],
            });
        }
    } catch (error) {
        console.error('Error fetching offline messages:', error);
        res.status(500).json({ status: false, message: 'An unexpected error occurred.' });
    }
};
