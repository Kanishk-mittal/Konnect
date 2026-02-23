import { Schema, Types, model, Document } from 'mongoose';

export interface IUser extends Document {
    user_type: 'admin' | 'student' | 'club' | 'faculty';
    id: string; // The user's ID
    college_code: string;
    email_id: string;
    profile_picture: string | null;
    username: string;
    blocked_users?: Types.ObjectId[];
    password_hash: string;
    recovery_password: string;
    private_key: string;
    public_key: string;
    recovery_key_hash: string;
}

const userSchema = new Schema<IUser>({
    // identification fields
    user_type: { type: String, enum: ['admin', 'student', 'club', 'faculty'], required: true },
    id: { type: String, required: true },
    college_code: { type: String, required: true },

    // personal information
    email_id: { type: String, required: true },
    profile_picture: { type: String, default: null },
    username: { type: String, required: true },
    // block users
    blocked_users: [{ type: Schema.Types.ObjectId, ref: 'User' }],

    // cryptographic fields
    password_hash: { type: String, required: true },
    recovery_password: { type: String, required: true },
    private_key: { type: String, required: true },
    public_key: { type: String, required: true },
    recovery_key_hash: { type: String, required: true },
},
    {
        timestamps: true,
    }
);

userSchema.index({ id: 1, college_code: 1 }, { unique: true });

export default model<IUser>('User', userSchema);

export type UserDocument = {
    _id: Types.ObjectId;
    user_type: 'admin' | 'student' | 'club' | 'faculty';
    id: string;
    college_code: string;
    email_id: string;
    profile_picture: string | null;
    username: string;
    is_blocked: boolean;
    blocked_users: Types.ObjectId[];
    password_hash: string;
    recovery_password: string;
    private_key: string;
    public_key: string;
    recovery_key_hash: string;
}

/**
 * here is the details of what each column mean
 * user_type: this will be either 'admin', 'student', 'club' or 'faculty'
 * id this will be the id which will be user for login 
 *      - for admin it will be the email_id
 *      - for student it will be the roll_number
 *      - for faculty it will be the email_id
 *      - for club it will be the email_id
 * 
 */

