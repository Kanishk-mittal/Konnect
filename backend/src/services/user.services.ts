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
import { encryptAES, generateAESKeyFromString } from '../utils/encryption/aes.utils';
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
