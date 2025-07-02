import { Schema, model, Types } from 'mongoose';

const chatGroupSchema = new Schema({
  name: { type: String, required: true },
  description: { type: String },
  icon: { type: String },
});

export default model('ChatGroup', chatGroupSchema);
