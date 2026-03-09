import { createSlice } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';

type ChatType = 'chat' | 'announcement' | 'group';

interface ChatState {
  chatType: ChatType;
  chatId: string | null;
  username: string | null;
  profilePicture: string | null;
}

const initialState: ChatState = {
  chatType: 'chat',
  chatId: null,
  username: null,
  profilePicture: null,
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
    clearChat: (state) => {
        state.chatType = 'chat';
        state.chatId = null;
        state.username = null;
        state.profilePicture = null;
    }
  },
});

export const { setChatType, setChatId, setChat, clearChat } = chatSlice.actions;

export default chatSlice.reducer;
