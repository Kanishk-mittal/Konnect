import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';
import { getData } from '../api/requests';

interface UserProfile {
  username: string;
  email: string;
  collegeCode: string;
  profilePicture: string | null;
  userType: string | null; // Keep userType here for easy access to profile-related logic
}

interface UserState {
  profile: UserProfile | null;
  status: 'idle' | 'loading' | 'succeeded' | 'failed';
  error: string | null;
}

const initialState: UserState = {
  profile: null,
  status: 'idle',
  error: null,
};

/**
 * Async thunk to fetch the current user's profile details.
 * The user must be authenticated for this to succeed.
 */
export const fetchUser = createAsyncThunk('user/fetchUser', async (_, { rejectWithValue }) => {
  try {
    const response = await getData('/user/details');
    if (response.status) {
      return response.data;
    }
    return rejectWithValue(response.message || 'Failed to fetch user details.');
  } catch (error: any) {
    return rejectWithValue(error.response?.data?.message || error.message);
  }
});

export const userSlice = createSlice({
  name: 'user',
  initialState,
  reducers: {
    clearUser: (state) => {
      state.profile = null;
      state.status = 'idle';
      state.error = null;
    },
    setProfilePicture: (state, action: PayloadAction<string>) => {
        if (state.profile) {
            state.profile.profilePicture = action.payload;
        }
    }
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchUser.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(fetchUser.fulfilled, (state, action: PayloadAction<any>) => {
        state.status = 'succeeded';
        state.profile = action.payload;
      })
      .addCase(fetchUser.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload as string;
      });
  },
});

export const { clearUser, setProfilePicture } = userSlice.actions;

export default userSlice.reducer;
