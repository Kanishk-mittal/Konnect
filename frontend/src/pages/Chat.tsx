// React and Redux imports
import { useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useParams, useNavigate } from 'react-router-dom';
import type { RootState } from '../store/store';
import Split from 'react-split';
import { setChat, triggerUpdate } from '../store/chatSlice';

// Components
import Header from '../components/Header';
import ChatLeftPanel from '../components/ChatLeftPanel';
import ChatWindow from '../components/ChatWindow';

// API and Services
import { socket, connectSocket, disconnectSocket } from '../api/socket';
import { decryptWithStoredKey } from '../services/cryptoService';
import { decryptAES } from '../encryption/AES_utils';
import { addChatMessage, addGroupMessage, addAnnouncementMessage } from '../database/messages.db';
import { v4 as uuidv4 } from 'uuid';

const Chat = () => {
  const theme = useSelector((state: RootState) => state.theme.theme);
  const { chatType, chatId } = useSelector((state: RootState) => state.chat);
  const { chatType: chatTypeFromUrl, id: idFromUrl } = useParams();
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const { userId } = useSelector((state: RootState) => state.auth);
  const { status: userStatus } = useSelector((state: RootState) => state.user);

  useEffect(() => {
    if (userStatus !== 'loading' && !userId) {
      navigate('/');
    }
  }, [userId, userStatus, navigate]);
  
  useEffect(() => {
    connectSocket();

    return () => {
      disconnectSocket();
    };
  }, []);

  useEffect(() => {
    if (chatTypeFromUrl && idFromUrl) {
      if (chatTypeFromUrl === 'chat' || chatTypeFromUrl === 'announcement' || chatTypeFromUrl === 'group') {
        dispatch(setChat({ chatType: chatTypeFromUrl, chatId: idFromUrl, username: `User ${idFromUrl}` }));
        navigate('/chat', { replace: true });
      }
    }
  }, [chatTypeFromUrl, idFromUrl, dispatch, navigate]);

  useEffect(() => {
    if (!userId) return;

    const handleNewMessage = async (data: { sender: string; message: string; groupId?: string }) => {
      try {
        const { sender, message, groupId } = data;
        
        // The message from the socket is a JSON string, parse it first
        const parsedMessage = JSON.parse(message);
        const { message: encryptedContent, encryptedAesKey, senderName, timestamp } = parsedMessage;

        // 1. Decrypt the AES key with user's private RSA key
        const aesKey = await decryptWithStoredKey(userId, encryptedAesKey);

        // 2. Decrypt the message content with the AES key
        const decryptedContent = decryptAES(encryptedContent, aesKey);

        const messageId = uuidv4();

        // 3. Store the message in the appropriate database
        if (groupId) {
          // It's a group or announcement message
          const groupMessage = {
            id: messageId,
            senderId: sender,
            senderName: senderName || 'Unknown User', // Use senderName from payload if available
            content: decryptedContent,
            readStatus: false,
            timestamp: timestamp || Date.now(),
            groupId: groupId,
          };
          
          // We need to know if it's an announcement or a regular group.
          // We can check the currently selected chat type if the incoming message is for the active chat.
          // For inactive chats, this logic might need to be more robust, but for now, we'll rely on current state.
          // A better approach in the future might be to include the type in the socket payload.
          if (chatId === groupId && chatType === 'announcement') {
            await addAnnouncementMessage(userId, groupMessage);
          } else {
            await addGroupMessage(userId, groupMessage);
          }

        } else {
          // It's a direct chat message
          await addChatMessage(userId, sender, {
            id: messageId,
            senderId: sender,
            content: decryptedContent,
            readStatus: false,
            timestamp: timestamp || Date.now(),
          });
        }

        // 4. Dispatch an action to notify the UI to update
        dispatch(triggerUpdate());

      } catch (error) {
        console.error('Failed to process incoming message:', error);
      }
    };

    socket.on('new_message', handleNewMessage);

    return () => {
      socket.off('new_message', handleNewMessage);
    };
  }, [userId, dispatch, chatType, chatId]);


  const leftPanelColor = theme === 'dark' ? '#1f2937' : '#FFC362';
  const rightPanelColor = theme ==='dark' ? '#1f2937' : '#FFC362';

  const backgroundGradient = theme === 'dark'
    ? 'linear-gradient(180deg, #000000 0%, #0E001B 8%)'
    : 'linear-gradient(180deg, #9435E5 0%, #FFD795 8%)';

  const headerBackground = theme === 'dark'
    ? {}
    : { background: 'radial-gradient(circle, rgba(255, 255, 255, 0.4) 0%, rgba(255, 255, 255, 0) 100%)' };


  return (
    <div className="flex flex-col h-screen" style={{ background: backgroundGradient }}>
      <div style={headerBackground}>
        <Header />
      </div>
      <div className="flex-grow flex p-3 min-h-0">
        <Split
          sizes={[30, 70]}
          minSize={[200, 400]}
          gutterSize={8}
          className="flex h-full w-full split"
        >
          <div style={{ backgroundColor: leftPanelColor }} className="h-full w-full rounded-lg p-4 overflow-y-auto">
            <ChatLeftPanel theme={theme} />
          </div>
          <div style={{ backgroundColor: rightPanelColor }} className="h-full w-full rounded-lg p-4 overflow-y-auto">
            {chatId ? (
              <ChatWindow
                chatId={chatId}
                type={chatType}
              />
            ) : (
              <div className="flex items-center justify-center h-full">
                <p className="text-lg text-gray-500">Select a chat to start messaging</p>
              </div>
            )}
          </div>
        </Split>
      </div>
    </div>
  );
};

export default Chat;
