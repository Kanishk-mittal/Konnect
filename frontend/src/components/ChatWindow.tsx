import React, { useEffect, useState, useRef } from 'react';
import { useSelector } from 'react-redux';
import type { RootState } from '../store/store';

const ChatWindow: React.FC = () => {
    const { chatType: globalChatType, chatId } = useSelector((state: RootState) => state.chat);
    const [localChatType, setLocalChatType] = useState<string | null>(null);
    const prevChatIdRef = useRef<string | null>();

    useEffect(() => {
        // Check if chatId has actually changed
        if (chatId !== prevChatIdRef.current) {
            if (chatId) {
                // If chatId changes, update the local chat type from the global state
                setLocalChatType(globalChatType);
            } else {
                setLocalChatType(null);
            }
        }
        // Update the ref for the next render
        prevChatIdRef.current = chatId;
    }, [chatId, globalChatType]);

    useEffect(() => {
        if (chatId && localChatType) {
            console.log(`Fetching data for chatId: ${chatId} of type ${localChatType}`);
            // Future data fetching logic will go here, using localChatType
        }
    }, [chatId, localChatType]); // This effect runs only when a new chat is truly selected

    if (!chatId) {
        return (
            <div className="flex items-center justify-center h-full">
                <p className="text-lg text-gray-500">Select a chat to start messaging</p>
            </div>
        );
    }

    return (
        <div>
            <h2 className="text-xl font-bold">Right Panel</h2>
            {/* Displaying localChatType to prove it's working as intended */}
            <p>Chat Type: {localChatType || 'Not specified'}</p>
            <p>ID: {chatId || 'Not specified'}</p>
            <p>Content for {chatId} of type {localChatType} goes here...</p>
        </div>
    );
};

export default ChatWindow;

