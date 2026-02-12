import { Schema, Types, model } from 'mongoose';

const userSchema = new Schema({
    // identification fields
    user_type: { type: String, enum: ['admin', 'student', 'club', 'faculty'], required: true },
    id: { type: String, required: true, unique: true },
    college_code: { type: Schema.Types.ObjectId, ref: 'College', required: true },

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

export default model('User', userSchema);

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

