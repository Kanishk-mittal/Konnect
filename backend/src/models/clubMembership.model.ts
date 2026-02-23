import { Schema, model, Types, Document } from 'mongoose';

export interface IClubMembership extends Document {
    club_id: Types.ObjectId;
    member_id: Types.ObjectId;
    position: string;
}

const clubMembershipSchema = new Schema<IClubMembership>({
    club_id: { type: Schema.Types.ObjectId, required: true, ref: 'Club' },
    member_id: { type: Schema.Types.ObjectId, required: true, ref: 'User' },
    position: { type: String, required: true }, // e.g., 'member', 'admin', 'president', etc.
}, {
    timestamps: true,
});

// Create compound index for better query performance
clubMembershipSchema.index({ club_id: 1, member_id: 1 }, { unique: true });

export default model<IClubMembership>('ClubMembership', clubMembershipSchema);
