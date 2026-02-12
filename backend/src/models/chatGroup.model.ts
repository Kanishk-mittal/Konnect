import { Schema, model, Types } from 'mongoose';

const chatGroupSchema = new Schema({
  name: { type: String, required: true },
  description: { type: String },
  icon: { type: String },
  college_code: { type: String, required: true },
  created_by: { type: Types.ObjectId, required: true, ref: 'User' },
}, {
  timestamps: true // Automatically adds createdAt and updatedAt
});

export default model('ChatGroup', chatGroupSchema);

/*
Note to future self:- 
1. This model is faulty and same goes to announcement group and so the membership models as well 
2. Current system assumes that only users are member of groups 
3. But a club and admin is also a valid member of group 
4. One solution is there 
 */