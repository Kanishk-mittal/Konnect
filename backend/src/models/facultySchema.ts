import { Schema, model, Types } from 'mongoose';


const facultySchema = new Schema({
    fullname: { type: String, required: true },
    blocked_users: [{ type: Types.ObjectId, ref: 'User' }],
    joining_date: { type: Date, default: Date.now },
});
