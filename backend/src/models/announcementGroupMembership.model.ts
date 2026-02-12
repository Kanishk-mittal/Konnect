import { Schema, model, Types } from 'mongoose';

const announcementGroupMembershipSchema = new Schema({
  member: { type: Types.ObjectId, required: true, ref: 'User' },
  group: { type: Types.ObjectId, ref: 'AnnouncementGroup' },
  added_on: { type: Date, default: Date.now },
  isAdmin: { type: Boolean, default: false },
});

export default model('AnnouncementGroupMembership', announcementGroupMembershipSchema);
