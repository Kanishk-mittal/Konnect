import { Schema, model } from 'mongoose';

const adminSchema = new Schema({
  user_id: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  is_root_admin: { type: Boolean, default: false },
  created_by: { type: Schema.Types.ObjectId, ref: 'Admin'},
},
  {
    timestamps: true,
  }
);

export default model('Admin', adminSchema);

export type AdminDocument = {
  user_id: string;
};
/**
 * if the user is the admin is the root admin then is_root_admin will be true else false. The root admin is the one who registers first for a college and has the highest privileges. The created_by field will store the user_id of the admin who created this admin. For the root admin, this field will be null.
 */