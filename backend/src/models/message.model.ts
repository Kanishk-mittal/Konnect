import { Schema, model, Types, Document } from 'mongoose';

export interface IMessage extends Document {
  message: string;
  aes_key: string;
  sender: Types.ObjectId;
  receiver: Types.ObjectId;
  isGroupMessage: boolean;
  groupId?: Types.ObjectId; // Optional, only for group messages
  isAnnouncement?: boolean; // Optional, only for announcements
  announcementId?: Types.ObjectId; // Optional, only for announcements
}

const messageSchema = new Schema<IMessage>({
  message: { type: String, required: true },
  aes_key: { type: String, required: true },
  sender: { type: Schema.Types.ObjectId, required: true, ref: 'User' },
  receiver: { type: Schema.Types.ObjectId, required: true, ref: 'User' },
  isGroupMessage: { type: Boolean, required: true },
  groupId: { type: Schema.Types.ObjectId, ref: 'ChatGroup' }, // Only set if isGroupMessage is true
  announcementId: { type: Schema.Types.ObjectId, ref: 'Announcement' }, // Only set if isAnnouncement is true
}, { timestamps: true });

export default model<IMessage>('Message', messageSchema);
