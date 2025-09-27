import { Schema, model, Types } from 'mongoose';

const announcementGroupSchema = new Schema({
  name: { type: String, required: true },
  description: { type: String },
  icon: { type: String },
  admin: [{ type: String }], // can be user or club leader
  adminType: { type: String, enum: ['user', 'club', 'admin'], default: 'user' },
  subGroups: [{ type: Types.ObjectId, ref: 'AnnouncementGroup' }],
  parentGroup: { type: Types.ObjectId, ref: 'AnnouncementGroup' },
}, {
  timestamps: true // Automatically adds createdAt and updatedAt
});

export default model('AnnouncementGroup', announcementGroupSchema);
