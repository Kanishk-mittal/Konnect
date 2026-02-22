import { Schema, model, Types } from 'mongoose';

const studentSchema = new Schema({
  user_id: { type: Types.ObjectId, required: true, ref: 'User' }, 
  fullname: { type: String, required: true },
  blocked_user: [{ type: Types.ObjectId, ref: 'User' }],
  is_blocked: { type: Boolean, default: false },
});

export default model('Student', studentSchema);

export type StudentDocument = {
  user_id: string;
  fullname: string; blocked_user?: string[],
  blocked_users?: string[];
  is_blocked?: boolean;
};