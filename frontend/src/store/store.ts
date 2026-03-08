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

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
export default store;
