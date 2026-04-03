// React and Redux imports
import { useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useParams, useNavigate } from 'react-router-dom';
import type { RootState } from '../store/store';
import Split from 'react-split';
import { setChat } from '../store/chatSlice';

// Components
import Header from '../components/Header';
import ChatLeftPanel from '../components/ChatLeftPanel';
import ChatWindow from '../components/ChatWindow';

import { connectSocket, disconnectSocket } from '../api/socket';

const Chat = () => {
  const theme = useSelector((state: RootState) => state.theme.theme);
  const { chatType, chatId, username, profilePicture } = useSelector((state: RootState) => state.chat);
  const { chatType: chatTypeFromUrl, id: idFromUrl } = useParams();
  const dispatch = useDispatch();
  const navigate = useNavigate();

  useEffect(() => {
    connectSocket();

    return () => {
      disconnectSocket();
    };
  }, []);

  useEffect(() => {
    if (chatTypeFromUrl && idFromUrl) {
      if (chatTypeFromUrl === 'chat' || chatTypeFromUrl === 'announcement' || chatTypeFromUrl === 'group') {
        // Here you would typically fetch user/group details based on idFromUrl
        // For now, we'll just set the basic info
        dispatch(setChat({ chatType: chatTypeFromUrl, chatId: idFromUrl, username: `User ${idFromUrl}` }));
        navigate('/chat', { replace: true });
      }
    }
  }, [chatTypeFromUrl, idFromUrl, dispatch, navigate]);

  const leftPanelColor = theme === 'dark' ? '#1f2937' : '#FFC362';
  const rightPanelColor = theme === 'dark' ? '#1f2937' : '#FFC362';

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
