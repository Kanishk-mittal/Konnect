import { Schema, model, Types } from 'mongoose';

const chatGroupMembershipSchema = new Schema({
  member: { type: Types.ObjectId, required: true, ref: 'User' },
  group: { type: Types.ObjectId, ref: 'ChatGroup' },
  isAdmin: { type: Boolean, default: false },
  added_on: { type: Date, default: Date.now },
});

export default model('ChatGroupMembership', chatGroupMembershipSchema);
