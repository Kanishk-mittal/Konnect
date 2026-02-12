import { Schema, model } from 'mongoose';
import { Types } from 'mongoose';

const clubSchema = new Schema({
  Club_name: { type: String, required: true },
  blocked_users: [{ type: Types.ObjectId, ref: 'User' }],
});



export default model('Club', clubSchema);

export type ClubDocument = {
  Club_name: string;
  blocked_users?: string[];
};
