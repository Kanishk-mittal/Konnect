
import { Schema, model, Types } from 'mongoose';

const blockedStudentSchema = new Schema({
  college_code: { type: String, required: true, ref: 'Admin' },
  student_id: { type: Types.ObjectId, required: true, ref: 'Student' },
  reason: { type: String, required: true },
}, { timestamps: true });

export default model('BlockedStudent', blockedStudentSchema);
