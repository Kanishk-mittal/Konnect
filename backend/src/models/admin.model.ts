import { Schema, model } from 'mongoose';

const adminSchema = new Schema({
  _college_code: { type: String, required: true, unique: true },
  college_name: { type: String, required: true },
  username: { type: String, required: true, unique: true },
  email_id: { type: String, required: true },
  password_hash: { type: String, required: true },
  recovery: { type: String, required: true },
  private_key: { type: String, required: true },
  public_key: { type: String, required: true },
});

export default model('Admin', adminSchema);
