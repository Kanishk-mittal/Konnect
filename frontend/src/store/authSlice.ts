import { createSlice } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';
import { clearAllPrivateKeys } from '../utils/privateKeyManager';

interface AuthState {
  email: string | null;
  isAuthenticated: boolean;
  privateKey: string | null;
  userId: string | null;
  userType: string | null;
}

const initialState: AuthState = {
  email: null,
  isAuthenticated: false,
  privateKey: null,
  userId: null,
  userType: null,
};

export const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setEmail: (state, action: PayloadAction<string>) => {
      state.email = action.payload;
    },
    setAuthenticated: (state, action: PayloadAction<boolean>) => {
      state.isAuthenticated = action.payload;
    },
    setPrivateKey: (state, action: PayloadAction<string>) => {
      state.privateKey = action.payload;
    },
    setUserId: (state, action: PayloadAction<string>) => {
      state.userId = action.payload;
    },
    setUserType: (state, action: PayloadAction<string>) => {
      state.userType = action.payload;
    },
    clearAuth: (state) => {
      state.email = null;
      state.isAuthenticated = false;
      state.privateKey = null;
      state.userId = null;
      state.userType = null;
      
      // Clear private keys from localStorage
      clearAllPrivateKeys();
    },
  },
});

export const { 
  setEmail, 
  setAuthenticated, 
  setPrivateKey, 
  setUserId, 
  setUserType, 
  clearAuth
} = authSlice.actions;

export default authSlice.reducer;
