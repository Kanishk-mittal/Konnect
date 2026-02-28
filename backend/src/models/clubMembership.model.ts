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

export default model<IClubMembership>('ClubMembership', clubMembershipSchema);
