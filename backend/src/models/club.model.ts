import { Schema, model } from 'mongoose';
import { Types } from 'mongoose';

const clubSchema = new Schema({
  blocked_users: [{ type: Types.ObjectId, ref: 'User' }],
  created_by: { type: Types.ObjectId, ref: 'Admin', required: true },
});



export default model('Club', clubSchema);

export type ClubDocument = {
  Club_name: string;
  blocked_users?: string[];
};
