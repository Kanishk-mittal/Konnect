import { Schema, model, Types, Document } from 'mongoose';

export interface IFaculty extends Document {
    fullname: string;
    blocked_users?: Types.ObjectId[];
    joining_date: Date;
}

const facultySchema = new Schema<IFaculty>({
    fullname: { type: String, required: true },
    blocked_users: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    joining_date: { type: Date, default: Date.now },
});

export default model<IFaculty>('Faculty', facultySchema);
