import { createSlice } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';

type ChatType = 'chat' | 'announcement' | 'group';

interface ChatState {
  chatType: ChatType;
  chatId: string | null;
}

const initialState: ChatState = {
  chatType: 'chat',
  chatId: null,
};

export const chatSlice = createSlice({
  name: 'chat',
  initialState,
  reducers: {
    setChatType: (state, action: PayloadAction<ChatType>) => {
      state.chatType = action.payload;
    },
    setChatId: (state, action: PayloadAction<string>) => {
      state.chatId = action.payload;
    },
    setChat: (state, action: PayloadAction<{ chatType: ChatType; chatId: string }>) => {
        state.chatType = action.payload.chatType;
        state.chatId = action.payload.chatId;
    },
    clearChat: (state) => {
        state.chatType = 'chat';
        state.chatId = null;
    }
  },
});

export const { setChatType, setChatId, setChat, clearChat } = chatSlice.actions;

export default chatSlice.reducer;
