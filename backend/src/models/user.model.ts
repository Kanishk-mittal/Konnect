import { Schema, model, Types } from 'mongoose';

const userSchema = new Schema({
  _id: { type: String, required: true }, // roll+college code
  display_name: { type: String, required: true },
  college: { type: String, required: true },
  email_id: { type: String, required: true },
  password_hash: { type: String, required: true },
  fullname: { type: String, required: true },
  recovery: { type: String, required: true }, // user's password encrypted with a special key
  private_key: { type: String, required: true }, // rsa private key encrypted with user's password
  public_key: { type: String, required: true }, // rsa public key encrypted with server private key
  blocked_user: [{ type: String, ref: 'User' }],
});

export default model('User', userSchema);
