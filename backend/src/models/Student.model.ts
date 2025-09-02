import { Schema, model, Types } from 'mongoose';

const studentSchema = new Schema({
  profile_picture: { type: String, default: null },
  roll: { type: String, required: true }, 
  display_name: { type: String, required: true },
  college_code: { type: String, required: true },
  email_id: { type: String, required: true },
  password_hash: { type: String, required: true },
  fullname: { type: String, required: true },
  recovery: { type: String, default: '' }, // user's password encrypted with a special key
  private_key: { type: String, required: true }, // rsa private key encrypted with user's password
  public_key: { type: String, required: true }, // rsa public key encrypted with server private key
  blocked_user: [{ type: Types.ObjectId, ref: 'User' }],
  is_blocked: { type: Boolean, default: false },
});

export default model('Student', studentSchema);
