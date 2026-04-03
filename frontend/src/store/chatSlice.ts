import { createSlice } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';

type ChatType = 'chat' | 'announcement' | 'group';

interface ChatState {
  chatType: ChatType;
  chatId: string | null;
  username: string | null;
  profilePicture: string | null;
  lastUpdated: number; // For triggering list updates
}

const initialState: ChatState = {
  chatType: 'chat',
  chatId: null,
  username: null,
  profilePicture: null,
  lastUpdated: Date.now(),
};

export const chatSlice = createSlice({
  name: 'chat',
  initialState,
  reducers: {
    setChatType: (state, action: PayloadAction<ChatType>) => {
      state.chatType = action.payload;
    },
    setChatId: (state, action: PayloadAction<string | null>) => {
      state.chatId = action.payload;
    },
    setChat: (state, action: PayloadAction<{ chatType: ChatType; chatId: string, username?: string, profilePicture?: string }>) => {
        state.chatType = action.payload.chatType;
        state.chatId = action.payload.chatId;
        state.username = action.payload.username ?? null;
        state.profilePicture = action.payload.profilePicture ?? null;

    },
    triggerUpdate: (state) => {
        state.lastUpdated = Date.now();
    },
    clearChat: (state) => {
        state.chatType = 'chat';
        state.chatId = null;
        state.username = null;
        state.profilePicture = null;
    }
  },
});

export const { setChatType, setChatId, setChat, clearChat, triggerUpdate } = chatSlice.actions;

export default chatSlice.reducer;
