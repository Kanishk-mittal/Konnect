import { Schema, model, Types } from 'mongoose';

const messageSchema = new Schema({
  message: { type: String, required: true },
  aes_key: { type: String, required: true },
  sender: { type: Types.ObjectId, required: true, ref: 'User' },
  receiver: { type: Types.ObjectId, required: true, ref: 'User' },
  isGroupMessage: { type: Boolean, required: true },
}, { timestamps: true });

export default model('Message', messageSchema);
