import { Schema, model, Types, Document } from 'mongoose';

export interface IChatGroupMembership extends Document {
  member: Types.ObjectId;
  group?: Types.ObjectId;
  isAdmin: boolean;
  added_on: Date;
}

const chatGroupMembershipSchema = new Schema<IChatGroupMembership>({
  member: { type: Schema.Types.ObjectId, required: true, ref: 'User' },
  group: { type: Schema.Types.ObjectId, ref: 'ChatGroup' },
  isAdmin: { type: Boolean, default: false },
  added_on: { type: Date, default: Date.now },
});

export default model<IChatGroupMembership>('ChatGroupMembership', chatGroupMembershipSchema);
