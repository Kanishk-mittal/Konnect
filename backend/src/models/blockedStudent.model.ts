
import { Schema, model, Types, Document } from 'mongoose';

export interface IBlockedStudent extends Document {
  college_code: string;
  student_id: Types.ObjectId;
  reason: string;
}

const blockedStudentSchema = new Schema<IBlockedStudent>({
  college_code: { type: String, required: true, ref: 'Admin' },
  student_id: { type: Schema.Types.ObjectId, required: true, ref: 'Student' },
  reason: { type: String, required: true },
}, { timestamps: true });

export default model<IBlockedStudent>('BlockedStudent', blockedStudentSchema);
