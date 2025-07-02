import { Schema, model, Types } from 'mongoose';

const announcementGroupSchema = new Schema({
  name: { type: String, required: true },
  description: { type: String },
  icon: { type: String },
  admin: [{ type: String, ref: 'User' }], // can be user or club leader
});

export default model('AnnouncementGroup', announcementGroupSchema);
