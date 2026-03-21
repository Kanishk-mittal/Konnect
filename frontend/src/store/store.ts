import { configureStore } from '@reduxjs/toolkit';
import themeReducer from './themeSlice';
import authReducer from './authSlice';
import chatReducer from './chatSlice';
import userReducer from './userSlice';
import loadingReducer from './loadingSlice'; // Import the new loading reducer

const store = configureStore({
  reducer: {
    theme: themeReducer,
    auth: authReducer,
    chat: chatReducer,
    user: userReducer,
    loading: loadingReducer, // Add the loading reducer
  },
});

// Explicitly define RootState based on the reducers
export type RootState = {
  theme: ReturnType<typeof themeReducer>;
  auth: ReturnType<typeof authReducer>;
  chat: ReturnType<typeof chatReducer>;
  user: ReturnType<typeof userReducer>;
  loading: ReturnType<typeof loadingReducer>; // Add the loading reducer type
};

export type AppDispatch = typeof store.dispatch;
export default store;
