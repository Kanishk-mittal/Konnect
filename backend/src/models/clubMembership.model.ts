import { Schema, model, Types } from 'mongoose';

const clubMembershipSchema = new Schema({
    club_id: { type: Types.ObjectId, required: true, ref: 'Club' },
    student_id: { type: Types.ObjectId, required: true, ref: 'Student' },
    position: { type: String, required: true }, // e.g., 'member', 'admin', 'president', etc.
}, {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
});

// Create compound index for better query performance
clubMembershipSchema.index({ club_id: 1, student_id: 1 }, { unique: true });

export default model('ClubMembership', clubMembershipSchema);
