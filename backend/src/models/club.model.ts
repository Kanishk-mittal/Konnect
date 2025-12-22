import { Schema, model } from 'mongoose';

const clubSchema = new Schema({
  Club_name: { type: String, required: true },
  college_code: { type: String, required: true },
  email: { type: String, required: true },
  password_hash: { type: String, required: true },
  recovery_password: { type: String, required: true },
  private_key: { type: String, required: true },
  public_key: { type: String, required: true },
  icon: { type: String },
});

export default model('Club', clubSchema);

export type ClubDocument = {
  Club_name: string;
  college_code: string;
  email: string;
  password_hash: string;
  recovery_password: string;
  private_key: string;
  public_key: string;
  icon?: string;
};
