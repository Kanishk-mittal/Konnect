import { createSlice } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';

interface AuthState {
  isAuthenticated: boolean;
  userId: string | null;
  userType: string | null;
  status: 'idle' | 'loading' | 'succeeded' | 'failed';
}

const initialState: AuthState = {
  isAuthenticated: false,
  userId: null,
  userType: null,
  status: 'idle',
};

export const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setAuth: (state, action: PayloadAction<{ userId: string; userType: string }>) => {
      state.isAuthenticated = true;
      state.userId = action.payload.userId;
      state.userType = action.payload.userType;
      state.status = 'succeeded';
    },
    clearAuth: (state) => {
      state.isAuthenticated = false;
      state.userId = null;
      state.userType = null;
      state.status = 'idle';
    },
    setAuthStatus: (state, action: PayloadAction<'idle' | 'loading' | 'succeeded' | 'failed'>) => {
        state.status = action.payload;
    }
  },
});

export const {
  setAuth,
  clearAuth,
  setAuthStatus,
} = authSlice.actions;

export default authSlice.reducer;
