import { Schema, model, Types } from 'mongoose';

const clubMembershipSchema = new Schema({
    club_id: { type: Types.ObjectId, required: true, ref: 'Club' },
    student_id: { type: Types.ObjectId, required: true, ref: 'Student' },
    mentor_id: { type: Types.ObjectId, ref: 'Faculty' }, // Optional field for mentor assignment
    position: { type: String, required: true }, // e.g., 'member', 'admin', 'president', etc.
}, {
    timestamps: true,
});

// Create compound index for better query performance
clubMembershipSchema.index({ club_id: 1, student_id: 1 }, { unique: true });

export default model('ClubMembership', clubMembershipSchema);
