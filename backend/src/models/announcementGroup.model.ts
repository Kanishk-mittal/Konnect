import { Schema, model, Types, Document } from 'mongoose';

export interface IAnnouncementGroup extends Document {
  name: string;
  description?: string;
  icon?: string;
  college_code: string;
  created_by: Types.ObjectId;
}

const announcementGroupSchema = new Schema<IAnnouncementGroup>({
  name: { type: String, required: true },
  description: { type: String },
  icon: { type: String },
  college_code: { type: String, required: true },
  created_by: { type: Schema.Types.ObjectId, required: true, ref: 'User' },
}, {
  timestamps: true // Automatically adds createdAt and updatedAt
});

export default model<IAnnouncementGroup>('AnnouncementGroup', announcementGroupSchema);
