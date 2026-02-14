import { Schema, model } from 'mongoose';
import { Types, Document } from 'mongoose';
import { UserDocument } from './user.model';

const clubSchema = new Schema({
  user_id: { type: Types.ObjectId, ref: 'User', required: true, unique: true },
  Club_name: { type: String, required: true },
  email: { type: String, required: true },
  icon: { type: String, default: null },
  college_code: { type: String, required: true },
  blocked_users: [{ type: Types.ObjectId, ref: 'User' }],
  blocked_students: [{ type: String }], // Array of roll numbers
  created_by: { type: Types.ObjectId, ref: 'Admin', required: true },
}, {
  timestamps: true
});

export interface ClubDocument extends Document {
  _id: Types.ObjectId;
  user_id: Types.ObjectId | UserDocument;
  Club_name: string;
  email: string;
  icon: string | null;
  college_code: string;
  blocked_users: Types.ObjectId[];
  blocked_students: string[];
  created_by: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

export default model<ClubDocument>('Club', clubSchema);
