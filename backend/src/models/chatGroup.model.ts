import { Schema, model, Types } from 'mongoose';

const chatGroupSchema = new Schema({
  name: { type: String, required: true },
  description: { type: String },
  icon: { type: String },
  college_code: { type: String, required: true },
  admin: [{ type: Types.ObjectId, ref: 'User' }], // group admins
}, {
  timestamps: true // Automatically adds createdAt and updatedAt
});

export default model('ChatGroup', chatGroupSchema);
