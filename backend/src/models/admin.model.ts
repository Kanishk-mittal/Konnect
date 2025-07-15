import { profile } from 'console';
import { Schema, model } from 'mongoose';

const adminSchema = new Schema({
  college_code: { type: String, required: true, unique: true },
  college_name: { type: String, required: true },
  username: { type: String, required: true, unique: true },
  profile_picture: { type: String||null, default: null }, // this will be a colcloudinary URL
  email_id: { type: String, required: true },
  password_hash: { type: String, required: true },
  recovery_password: { type: String, required: true },
  private_key: { type: String, required: true },
  public_key: { type: String, required: true },
  recovery_key_hash: { type: String, required: true },
});

export default model('Admin', adminSchema);

export type AdminDocument = {
  college_code: string;
  college_name: string;
  username: string;
  profile_picture: string | null; // can be null if not set
  email_id: string;
  password_hash: string;
  recovery_password: string;
  private_key: string;
  public_key: string;
  recovery_key_hash: string;
};