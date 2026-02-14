export type userDataInput = {
    userType: 'admin' | 'student' | 'club' | 'faculty';
    id: string;
    collegeCode: string;
    emailId: string;
    username: string;
    password: string;
}

type cryptographicFields = {
    passwordHash: string;
    recoveryPassword: string;
    privateKey: string;
    publicKey: string;
    recoveryKeyHash: string;
}

import { createHash } from '../utils/encryption/hash.utils';
import { encryptRSA, generateRSAKeyPair } from '../utils/encryption/rsa.utils';
import { decryptAES, encryptAES, generateAESKeyFromString } from '../utils/encryption/aes.utils';
import { internalAesKey } from '../constants/keys';
import UserModel, { UserDocument } from '../models/user.model';

const createCryptographicFields = async (password: string): Promise<{ docFields: any, rawKeys: { recoveryKey: string, privateKey: string } }> => {
    // Hash password
    const passwordHash = await createHash(password);

    // Create recovery password (user's password encrypted with RSA)
    const [recoveryKey, recoveryPublicKey] = generateRSAKeyPair();
    const recoveryPassword = encryptRSA(password, recoveryPublicKey);

    // Use await for the hash since it returns a Promise
    const recoveryKeyHash = await createHash(recoveryKey);

    // Generate user's RSA key pair
    const [privateKey, publicKey] = generateRSAKeyPair();

    // Encrypt keys for storage
    const encryptedPrivateKey = encryptAES(privateKey, generateAESKeyFromString(password));
    const encryptedPublicKey = encryptAES(publicKey, internalAesKey);

    return {
        docFields: {
            password_hash: passwordHash,
            recovery_password: recoveryPassword,
            private_key: encryptedPrivateKey,
            public_key: encryptedPublicKey,
            recovery_key_hash: recoveryKeyHash,
        },
        rawKeys: {
            recoveryKey,
            privateKey,
        },
    };
};

/**
 * Updates cryptographic fields when a user changes their password.
 * Decrypts the existing private key with the old password and re-encrypts it with the new one.
 * Also regenerates recovery information.
 * 
 * @param user - The user document containing existing encrypted keys
 * @param oldPassword - The current password used to decrypt existing keys
 * @param newPassword - The new password to be used for encryption
 */
export const updateCryptographicFields = async (
    user: UserDocument,
    oldPassword: string,
    newPassword: string
): Promise<{ status: boolean; recoveryKey?: string; error?: string }> => {
    try {
        // 1. Decrypt existing private key using oldPassword
        // generateAESKeyFromString(oldPassword) gives the key used for the current private_key
        const decryptedPrivateKey = decryptAES(user.private_key, generateAESKeyFromString(oldPassword));

        // 2. Hash new password
        const passwordHash = await createHash(newPassword);

        // 3. Create new recovery password (user's new password encrypted with a new recovery RSA public key)
        const [recoveryKey, recoveryPublicKey] = generateRSAKeyPair();
        const recoveryPassword = encryptRSA(newPassword, recoveryPublicKey);
        const recoveryKeyHash = await createHash(recoveryKey);

        // 4. Re-encrypt the existing private key with the newPassword
        const encryptedPrivateKey = encryptAES(decryptedPrivateKey, generateAESKeyFromString(newPassword));

        const updateData = {
            password_hash: passwordHash,
            recovery_password: recoveryPassword,
            private_key: encryptedPrivateKey,
            recovery_key_hash: recoveryKeyHash,
        };

        // Save the updated fields to the database
        const updatedUser = await UserModel.findByIdAndUpdate(user._id, updateData, { new: true });

        if (!updatedUser) {
            return {
                status: false,
                error: 'Failed to find user to update.'
            };
        }

        return {
            status: true,
            recoveryKey
        };
    } catch (error) {
        return {
            status: false,
            error: (error as Error).message
        };
    }
};

const createUserDocument = async (userData: userDataInput): Promise<{ userDoc: any, rawKeys: any }> => {
    const { docFields, rawKeys } = await createCryptographicFields(userData.password);

    return {
        userDoc: {
            user_type: userData.userType,
            id: userData.id,
            college_code: userData.collegeCode,
            email_id: userData.emailId,
            profile_picture: null,
            username: userData.username,
            blocked_users: [],
            ...docFields,
        },
        rawKeys
    };
};

export const createUser = async (userData: userDataInput): Promise<{ status: boolean, error?: string, user?: any, rawKeys?: any }> => {
    try {
        const { userDoc, rawKeys } = await createUserDocument(userData);
        const newUser = new UserModel(userDoc);
        await newUser.save();
        return { status: true, user: newUser.toObject(), rawKeys };
    } catch (error) {
        return { status: false, error: (error as Error).message };
    }
};

/**
 * Deletes a user from the User collection by their _id.
 * @param userId - The _id of the user to delete
 * @returns {Promise<{ status: boolean, error?: string }>}
 */
export const deleteUser = async (userId: string): Promise<{ status: boolean, error?: string }> => {
    try {
        const deletedUser = await UserModel.findByIdAndDelete(userId);
        if (!deletedUser) {
            return { status: false, error: 'User not found.' };
        }
        return { status: true };
    } catch (error) {
        return { status: false, error: (error as Error).message };
    }
};
