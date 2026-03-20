import { configureStore } from '@reduxjs/toolkit';
import themeReducer from './themeSlice';
import authReducer from './authSlice';
import chatReducer from './chatSlice';

const store = configureStore({
  reducer: {
    theme: themeReducer,
    auth: authReducer,
    chat: chatReducer,
  },
});

// Explicitly define RootState based on the reducers
export type RootState = {
  theme: ReturnType<typeof themeReducer>;
  auth: ReturnType<typeof authReducer>;
  chat: ReturnType<typeof chatReducer>;
};

export type AppDispatch = typeof store.dispatch;
export default store;
