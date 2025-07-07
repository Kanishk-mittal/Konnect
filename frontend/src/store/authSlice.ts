import { createSlice } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';

interface AuthState {
  email: string | null;
  isAuthenticated: boolean;
}

const initialState: AuthState = {
  email: null,
  isAuthenticated: false,
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
    clearAuth: (state) => {
      state.email = null;
      state.isAuthenticated = false;
    },
  },
});

export const { setEmail, setAuthenticated, clearAuth } = authSlice.actions;

export default authSlice.reducer;
