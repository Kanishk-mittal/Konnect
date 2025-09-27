import { Schema, model, Types } from 'mongoose';

const chatGroupMembershipSchema = new Schema({
  member: { type: Types.ObjectId, required: true, ref: 'User' },
  group: { type: Types.ObjectId, ref: 'ChatGroup' },
  isAdmin: { type: Boolean, default: false },
  created_at: { type: Date, default: Date.now },
});

export default model('ChatGroupMembership', chatGroupMembershipSchema);
