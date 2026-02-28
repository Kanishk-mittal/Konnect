import { Schema, model } from 'mongoose';
import { Types, Document } from 'mongoose';
import { UserDocument } from './user.model';

export interface ClubDocument extends Document {
  user_id: Types.ObjectId | UserDocument;
  Club_name: string;
  email: string;
  icon: string | null;
  college_code: string;
  blocked_users: Types.ObjectId[];
  created_by: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const clubSchema = new Schema<ClubDocument>({
  user_id: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  Club_name: { type: String, required: true },
  email: { type: String, required: true },
  icon: { type: String, default: null },
  college_code: { type: String, required: true },
  blocked_users: [{ type: Schema.Types.ObjectId, ref: 'User' }],
  created_by: { type: Schema.Types.ObjectId, ref: 'Admin', required: true },
}, {
  timestamps: true
});

export default model<ClubDocument>('Club', clubSchema);
