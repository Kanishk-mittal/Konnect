import { Schema, model, Types } from 'mongoose';

const chatGroupSchema = new Schema({
  name: { type: String, required: true },
  description: { type: String },
  icon: { type: String },
  subGroups: [{ type: Types.ObjectId, ref: 'ChatGroup' }],
  parentGroup: { type: Types.ObjectId, ref: 'ChatGroup' },
}, {
  timestamps: true // Automatically adds createdAt and updatedAt
});

export default model('ChatGroup', chatGroupSchema);
