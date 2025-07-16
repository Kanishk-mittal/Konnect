import { getPrivateKey } from './privateKeyManager';
import { setPrivateKey } from '../store/authSlice';

/**
 * Gets private key from Redux store, with fallback to localStorage
 * @param privateKey Current private key from Redux store
 * @param userType User type (admin, student, club)
 * @param userId User ID
 * @param dispatch Redux dispatch function
 * @returns Promise<string | null> The private key or null if not found
 */
export const getPrivateKeyWithFallback = async (
    privateKey: string | null,
    userType: string | null,
    userId: string | null,
    dispatch: any
): Promise<string | null> => {
    // If private key exists in Redux store, return it
    if (privateKey) {
        return privateKey;
    }

    // If no userType or userId, can't fetch from localStorage
    if (!userType || !userId) {
        return null;
    }

    try {
        // Try to get from localStorage
        const storedPrivateKey = await getPrivateKey(userType, userId);

        if (storedPrivateKey) {
            // Set it in Redux store for future use
            dispatch(setPrivateKey(storedPrivateKey));
            return storedPrivateKey;
        }
    } catch (error) {
        console.error('Error loading private key from localStorage:', error);
    }

    return null;
};
