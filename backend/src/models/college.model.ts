import { Schema, model, Document } from 'mongoose';

export interface ICollege extends Document {
    college_code: string;
    college_name: string;
}

const collegeSchema = new Schema<ICollege>({
    college_code: { type: String, required: true, unique: true },
    college_name: { type: String, required: true },
});

export default model<ICollege>('College', collegeSchema);

export type CollegeDocument = { college_code: string; college_name: string; };