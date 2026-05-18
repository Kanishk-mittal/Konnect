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

import { createHash, verifyHash } from '../utils/encryption/hash.utils';
import { decryptRSA, encryptRSA, generateRSAKeyPair } from '../utils/encryption/rsa.utils';
import { decryptAES, encryptAES, generateAESKeyFromString } from '../utils/encryption/aes.utils';
import { internalAesKey } from '../constants/keys';
import UserModel, { UserDocument } from '../models/user.model';

/**
 * Normalizes a recovery key by removing all newline characters.
 * This ensures consistency between keys generated with newlines (PEM format)
 * and keys submitted via single-line input fields.
 */
const normalizeRecoveryKey = (key: string): string => {
    return key.replace(/[\r\n]+/g, '').trim();
};

const createCryptographicFields = async (password: string): Promise<{ docFields: any, rawKeys: { recoveryKey: string, privateKey: string } }> => {
    // Hash password
    const passwordHash = await createHash(password);

    // Create recovery password (user's password encrypted with RSA)
    const [recoveryKey, recoveryPublicKey] = generateRSAKeyPair();
    const recoveryPassword = encryptRSA(password, recoveryPublicKey);

    // Normalize the recovery key before hashing to ensure consistency
    const normalizedRecoveryKey = normalizeRecoveryKey(recoveryKey);
    const recoveryKeyHash = await createHash(normalizedRecoveryKey);

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
 * Recovers a user's password using a recovery key.
 * 
 * @param user - The user document
 * @param recoveryKey - The RSA private key provided by the user
 * @param newPassword - The new password to be set
 */
export const recoverPasswordService = async (
    user: UserDocument,
    recoveryKey: string,
    newPassword: string
): Promise<{ status: boolean; recoveryKey?: string; error?: string }> => {
    try {
        // Normalize the provided recovery key to handle format inconsistencies
        const normalizedInputKey = normalizeRecoveryKey(recoveryKey);

        // 1. Verify the recovery key by hashing it and comparing with the stored hash
        const isRecoveryKeyValid = await verifyHash(normalizedInputKey, user.recovery_key_hash);
        if (!isRecoveryKeyValid) {
            return {
                status: false,
                error: 'Invalid recovery key.'
            };
        }

        // 2. Decrypt the recovery_password using the provided recoveryKey (RSA Private Key)
        // recovery_password is the user's old password encrypted with the recovery public key
        let oldPassword: string;
        try {
            oldPassword = decryptRSA(user.recovery_password, normalizedInputKey);
        } catch (error) {
            return {
                status: false,
                error: 'Failed to decrypt credentials with the provided recovery key. Ensure the recovery key is correct.'
            };
        }

        // 3. Decrypt existing private key using the oldPassword
        const decryptedPrivateKey = decryptAES(user.private_key, generateAESKeyFromString(oldPassword));

        // 4. Update password and cryptographic fields
        const passwordHash = await createHash(newPassword);

        // 5. Create new recovery info
        const [newRecoveryKey, newRecoveryPublicKey] = generateRSAKeyPair();
        const newRecoveryPassword = encryptRSA(newPassword, newRecoveryPublicKey);
        const newRecoveryKeyHash = await createHash(newRecoveryKey);

        // 6. Re-encrypt the existing private key with the newPassword
        const encryptedPrivateKey = encryptAES(decryptedPrivateKey, generateAESKeyFromString(newPassword));

        const updateData = {
            password_hash: passwordHash,
            recovery_password: newRecoveryPassword,
            private_key: encryptedPrivateKey,
            recovery_key_hash: newRecoveryKeyHash,
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
            recoveryKey: newRecoveryKey
        };
    } catch (error) {
        return {
            status: false,
            error: (error as Error).message
        };
    }
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
        
        // Normalize the recovery key before hashing to ensure consistency
        const normalizedRecoveryKey = normalizeRecoveryKey(recoveryKey);
        const recoveryKeyHash = await createHash(normalizedRecoveryKey);

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

/**
 * Regenerates the recovery key and recovery password for a user using their current password.
 * 
 * @param user - The user document
 * @param password - The user's current password
 */
export const generateRecoveryKeyService = async (
    user: UserDocument,
    password: string
): Promise<{ status: boolean; recoveryKey?: string; error?: string }> => {
    try {
        // 1. Create new recovery password (user's password encrypted with a new recovery RSA public key)
        const [recoveryKey, recoveryPublicKey] = generateRSAKeyPair();
        const recoveryPassword = encryptRSA(password, recoveryPublicKey);
        
        // Normalize the recovery key before hashing to ensure consistency
        const normalizedRecoveryKey = normalizeRecoveryKey(recoveryKey);
        const recoveryKeyHash = await createHash(normalizedRecoveryKey);

        const updateData = {
            recovery_password: recoveryPassword,
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
