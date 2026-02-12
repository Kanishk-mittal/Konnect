import { Schema, model } from 'mongoose';

const adminSchema = new Schema({
  user_id: { type: Schema.Types.ObjectId, ref: 'User', required: true },

},
  {
    timestamps: true,
  }
);

export default model('Admin', adminSchema);

export type AdminDocument = {
  user_id: string;
};