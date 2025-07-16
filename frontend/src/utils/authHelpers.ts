import type { AppDispatch } from '../store/store';
import { setAuthenticated, setPrivateKey, setUserId, setUserType, setEmail } from '../store/authSlice';
import { savePrivateKey } from './privateKeyManager';

/**
 * Helper function to handle successful login/registration
 * Saves user data to Redux store and private key to localStorage
 * @param dispatch Redux dispatch function
 * @param userData User data from login/registration response
 */
export const handleAuthSuccess = async (
    dispatch: AppDispatch,
    userData: {
        id: string;
        userType: string;
        privateKey?: string;
        email?: string;
    }
): Promise<void> => {
    try {
        // Set user data in Redux store
        dispatch(setUserId(userData.id));
        dispatch(setUserType(userData.userType));
        dispatch(setAuthenticated(true));
        
        if (userData.email) {
            dispatch(setEmail(userData.email));
        }
        
        if (userData.privateKey) {
            dispatch(setPrivateKey(userData.privateKey));
            // Save private key to localStorage as backup
            await savePrivateKey(userData.privateKey, userData.userType, userData.id);
        }
    } catch (error) {
        console.error('Error handling auth success:', error);
        throw error;
    }
};

/**
 * Helper function to load private key from localStorage on app startup
 * @param dispatch Redux dispatch function
 * @param userType User type (admin, student, etc.)
 * @param userId User ID
 */
export const loadPrivateKeyOnStartup = async (
    dispatch: AppDispatch,
    userType: string,
    userId: string
): Promise<void> => {
    try {
        const { getPrivateKey } = await import('./privateKeyManager');
        const privateKey = await getPrivateKey(userType, userId);
        
        if (privateKey) {
            dispatch(setPrivateKey(privateKey));
        }
    } catch (error) {
        console.error('Error loading private key on startup:', error);
        // Don't throw error here, as this is optional
    }
};
