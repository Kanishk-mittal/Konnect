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

const Chat = () => {
  const theme = useSelector((state: RootState) => state.theme.theme);
  const { chatType: chatTypeFromUrl, id: idFromUrl } = useParams();
  const dispatch = useDispatch();
  const navigate = useNavigate();

  useEffect(() => {
    if (chatTypeFromUrl && idFromUrl) {
      if (chatTypeFromUrl === 'chat' || chatTypeFromUrl === 'announcement' || chatTypeFromUrl === 'group') {
        dispatch(setChat({ chatType: chatTypeFromUrl, chatId: idFromUrl }));
        navigate('/chat', { replace: true });
      }
    }
  }, [chatTypeFromUrl, idFromUrl, dispatch, navigate]);

  const gradientClasses = "bg-[radial-gradient(circle,_rgba(255,255,255,0.3)_0%,_rgba(219,178,255,0.3)_55%,_rgba(219,178,255,0.3)_100%)]";
  const transparentClasses = "bg-transparent";

  // Define theme-specific colors
  const leftPanelColor = theme === 'dark' ? '#1f2937' : '#FFC362';
  const rightPanelColor = theme === 'dark' ? '#1f2937' : '#FFC362';

  const backgroundGradient = theme === 'dark'
    ? 'linear-gradient(180deg, #000000 0%, #0E001B 8%)'
    : 'linear-gradient(180deg, #9435E5 0%, #FFD795 8%)';

  const headerBackground = theme === 'dark'
    ? {} // No background for dark theme
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
                <ChatWindow />
            </div>
        </Split>
      </div>
    </div>
  );
};

export default Chat;
