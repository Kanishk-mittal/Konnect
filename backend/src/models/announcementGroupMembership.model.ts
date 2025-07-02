import { Schema, model, Types } from 'mongoose';

const announcementGroupMembershipSchema = new Schema({
  member: { type: String, required: true, ref: 'User' },
  group: [{ type: Types.ObjectId, ref: 'AnnouncementGroup' }],
  created_at: { type: Date, default: Date.now },
  admin: { type: Boolean, default: false },
});

export default model('AnnouncementGroupMembership', announcementGroupMembershipSchema);
