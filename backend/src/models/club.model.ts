import { Schema, model } from 'mongoose';
import { Types, Document } from 'mongoose';
import { UserDocument } from './user.model';

const clubSchema = new Schema({
  user_id: { type: Types.ObjectId, ref: 'User', required: true, unique: true },
  blocked_users: [{ type: Types.ObjectId, ref: 'User' }],
  created_by: { type: Types.ObjectId, ref: 'Admin', required: true },
});



export interface ClubDocument extends Document {
  user_id: Types.ObjectId | UserDocument;
  blocked_users: Types.ObjectId[];
  created_by: Types.ObjectId;
}

export default model<ClubDocument>('Club', clubSchema);
