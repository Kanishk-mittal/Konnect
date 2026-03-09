import React from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { setChatType, setChatId } from '../store/chatSlice';
import type { RootState } from '../store/store';
import ChatItem from './ChatItem';

interface ChatLeftPanelProps {
  theme: string;
}

const ChatLeftPanel: React.FC<ChatLeftPanelProps> = ({ theme }) => {
  const dispatch = useDispatch();
  const { chatType } = useSelector((state: RootState) => state.chat);

  // Theme-aware styling for the tab selector
  const tabContainerStyle = {
    backgroundColor: theme === 'dark' ? '#111827' : '#FEF3C7',
    padding: '0.5rem',
    borderRadius: '0.375rem',
    marginBottom: '1rem',
  };

  const activeTabStyle = {
    backgroundColor: theme === 'dark' ? '#374151' : '#FBBF24',
    color: theme === 'dark' ? '#FFFFFF' : '#000000',
  };

  const inactiveTabStyle = {
    backgroundColor: 'transparent',
    color: theme === 'dark' ? '#9CA3AF' : '#78350F',
  };

  // Dummy data for demonstration
  const dummyChats = [
    { id: '1', name: 'Alice', profilePicture: null, unreadCount: 2 },
    { id: '2', name: 'Bob', profilePicture: null, unreadCount: 0 },
    { id: '3', name: 'Charlie', profilePicture: null, unreadCount: 5 },
  ];

  const dummyGroups = [
    { id: 'g1', name: 'React Developers', profilePicture: null, unreadCount: 10 },
    { id: 'g2', name: 'Node.js Enthusiasts', profilePicture: null, unreadCount: 0 },
  ];

  const dummyAnnouncements = [
    { id: 'a1', name: 'General', profilePicture: null, unreadCount: 1 },
    { id: 'a2', name: 'Event Updates', profilePicture: null, unreadCount: 3 },
  ];

  const handleItemClick = (id: string) => {
    dispatch(setChatId(id));
  };

  return (
    <div className="flex flex-col h-full">
      {/* Tab selection */}
      <div className="flex justify-around" style={tabContainerStyle}>
        <button
          className="px-4 py-2 rounded-md font-medium"
          style={chatType === 'chat' ? activeTabStyle : inactiveTabStyle}
          onClick={() => dispatch(setChatType('chat'))}
        >
          Chat
        </button>
        <button
          className="px-4 py-2 rounded-md font-medium"
          style={chatType === 'group' ? activeTabStyle : inactiveTabStyle}
          onClick={() => dispatch(setChatType('group'))}
        >
          Group
        </button>
        <button
          className="px-4 py-2 rounded-md font-medium"
          style={chatType === 'announcement' ? activeTabStyle : inactiveTabStyle}
          onClick={() => dispatch(setChatType('announcement'))}
        >
          Announcement
        </button>
      </div>

      {/* List content based on selected tab */}
      <div className="flex-grow overflow-y-auto">
        {chatType === 'chat' && (
          <div>
            {dummyChats.map(chat => <ChatItem key={chat.id} {...chat} onClick={handleItemClick} />)}
          </div>
        )}
        {chatType === 'group' && (
          <div>
            {dummyGroups.map(group => <ChatItem key={group.id} {...group} onClick={handleItemClick} />)}
          </div>
        )}
        {chatType === 'announcement' && (
          <div>
            {dummyAnnouncements.map(ann => <ChatItem key={ann.id} {...ann} onClick={handleItemClick} />)}
          </div>
        )}
      </div>
    </div>
  );
};

export default ChatLeftPanel;


