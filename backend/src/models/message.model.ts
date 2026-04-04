import { Schema, model, Types, Document } from 'mongoose';

export interface IMessage extends Document {
  message: string;
  aes_key: string;
  sender: Types.ObjectId;
  receiver: Types.ObjectId;
  isGroupMessage: boolean;
  groupId?: Types.ObjectId;
  timestamp: number;
  senderName?: string;
  messageType: 'chat' | 'group' | 'announcement';
}

const messageSchema = new Schema<IMessage>({
  message: { type: String, required: true },
  aes_key: { type: String, required: true },
  sender: { type: Schema.Types.ObjectId, required: true, ref: 'User' },
  receiver: { type: Schema.Types.ObjectId, required: true, ref: 'User', index: true },
  isGroupMessage: { type: Boolean, required: true, default: false },
  groupId: { type: Schema.Types.ObjectId, ref: 'ChatGroup' },
  timestamp: { type: Number, required: true, index: true },
  senderName: { type: String },
  messageType: { type: String, enum: ['chat', 'group', 'announcement'], required: true },
}, { timestamps: true });

export default model<IMessage>('Message', messageSchema);
