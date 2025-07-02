import { Schema, model } from 'mongoose';

const clubSchema = new Schema({
  _id: { type: String, required: true }, // concatenation of club name and college code
  Club_name: { type: String, required: true },
  college_code: { type: String, required: true },
  mentor_email: { type: String, required: true },
});

export default model('Club', clubSchema);
