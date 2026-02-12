import { Schema, model } from 'mongoose';

const collegeSchema = new Schema({
    college_code: { type: String, required: true, unique: true },
    college_name: { type: String, required: true },
});

export default model('College', collegeSchema);

export type CollegeDocument = { college_code: string; college_name: string; };