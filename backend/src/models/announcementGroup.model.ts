import { Schema, model, Types } from 'mongoose';

const announcementGroupSchema = new Schema({
  name: { type: String, required: true },
  description: { type: String },
  icon: { type: String },
  college_code: { type: String, required: true },
  created_by: { type: Types.ObjectId, required: true, ref: 'User' },
}, {
  timestamps: true // Automatically adds createdAt and updatedAt
});

export default model('AnnouncementGroup', announcementGroupSchema);
