import { Schema, model, Types, Document } from 'mongoose';

export interface IMessage extends Document {
  message: string;
  aes_key: string;
  sender: Types.ObjectId;
  receiver: Types.ObjectId;
  isGroupMessage: boolean;
}

const messageSchema = new Schema<IMessage>({
  message: { type: String, required: true },
  aes_key: { type: String, required: true },
  sender: { type: Schema.Types.ObjectId, required: true, ref: 'User' },
  receiver: { type: Schema.Types.ObjectId, required: true, ref: 'User' },
  isGroupMessage: { type: Boolean, required: true },
}, { timestamps: true });

export default model<IMessage>('Message', messageSchema);
