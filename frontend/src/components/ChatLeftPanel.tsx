import React, { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { setChatType, setChatId } from '../store/chatSlice';
import type { RootState } from '../store/store';
import ChatItem from './ChatItem';
import { getData } from '../api/requests';

interface ListItem {
  id: string;
  name: string;
  profilePicture: string | null;
  unreadCount: number;
}

interface ChatLeftPanelProps {
  theme: string;
}

const ChatLeftPanel: React.FC<ChatLeftPanelProps> = ({ theme }) => {
  const dispatch = useDispatch();
  const { chatType } = useSelector((state: RootState) => state.chat);
  const [listItems, setListItems] = useState<ListItem[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchItems = async () => {
      setLoading(true);
      setListItems([]);
      try {
        let endpoint = '';
        if (chatType === 'chat') {
          endpoint = '/user/users/college';
        } else if (chatType === 'group') {
          endpoint = '/groups/member-of/chat';
        } else if (chatType === 'announcement') {
          endpoint = '/groups/member-of/announcement';
        }

        if (endpoint) {
          const response = await getData(endpoint);
          let items: ListItem[] = [];
          if (chatType === 'chat') {
            items = response.data.map((user: any) => ({
              id: user._id,
              name: user.username,
              profilePicture: user.profile_picture || null,
              unreadCount: 0, // Placeholder for now
            }));
          } else { // group and announcement
            items = response.data.map((group: any) => ({
              id: group.id,
              name: group.name,
              profilePicture: group.icon || null,
              unreadCount: 0, // Placeholder for now
            }));
          }
          setListItems(items);
        }
      } catch (error) {
        console.error(`Error fetching ${chatType}s:`, error);
      } finally {
        setLoading(false);
      }
    };

    fetchItems();
  }, [chatType]);

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
        {loading ? (
          <div className="flex justify-center items-center h-full">
            <p style={{ color: theme === 'dark' ? 'white' : 'black' }}>Loading...</p>
          </div>
        ) : (
          <div>
            {listItems.map(item => <ChatItem key={item.id} {...item} onClick={handleItemClick} />)}
          </div>
        )}
      </div>
    </div>
  );
};

export default ChatLeftPanel;


