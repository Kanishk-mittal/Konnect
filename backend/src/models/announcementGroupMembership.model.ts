import { Schema, model, Types, Document } from 'mongoose';

export interface IAnnouncementGroupMembership extends Document {
  member: Types.ObjectId;
  group?: Types.ObjectId;
  added_on: Date;
  isAdmin: boolean;
}

const announcementGroupMembershipSchema = new Schema<IAnnouncementGroupMembership>({
  member: { type: Schema.Types.ObjectId, required: true, ref: 'User' },
  group: { type: Schema.Types.ObjectId, ref: 'AnnouncementGroup' },
  added_on: { type: Date, default: Date.now },
  isAdmin: { type: Boolean, default: false },
});

export default model<IAnnouncementGroupMembership>('AnnouncementGroupMembership', announcementGroupMembershipSchema);
