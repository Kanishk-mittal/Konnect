import { Schema, model, Types, Document } from 'mongoose';

export interface IStudent extends Document {
  user_id: Types.ObjectId;
  fullname: string;
  blocked_user?: Types.ObjectId[];
  is_blocked?: boolean;
}

const studentSchema = new Schema<IStudent>({
  user_id: { type: Schema.Types.ObjectId, required: true, ref: 'User' },
  fullname: { type: String, required: true },
  blocked_user: [{ type: Schema.Types.ObjectId, ref: 'User' }],
  is_blocked: { type: Boolean, default: false },
});

export default model<IStudent>('Student', studentSchema);

export type StudentDocument = {
  user_id: string;
  fullname: string; blocked_user?: string[],
  blocked_users?: string[];
  is_blocked?: boolean;
};