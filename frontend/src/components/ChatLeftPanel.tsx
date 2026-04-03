import React, { useState, useEffect, useCallback } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { setChatType, setChatId } from '../store/chatSlice';
import type { RootState } from '../store/store';
import ChatItem from './ChatItem';
import { getData } from '../api/requests';
import { getItems, upsertItems, updateItemTimestamp } from '../database/userList.db';
import { type ListStoreName, CHAT_LIST_STORE, GROUP_STORE, ANNOUNCEMENT_STORE, type ContactListItem } from '../database/schema.db';
import { getUnreadChatMessagesCount, getUnreadGroupMessagesCount, getUnreadAnnouncementMessagesCount, markChatRead, markGroupRead, markAnnouncementRead } from '../database/messages.db';

interface ListItem extends ContactListItem {
  unreadCount: number;
}

interface ChatLeftPanelProps {
  theme: string;
}

const ChatLeftPanel: React.FC<ChatLeftPanelProps> = ({ theme }) => {
  const dispatch = useDispatch();
  const { chatType, lastUpdated } = useSelector((state: RootState) => state.chat);
  const { userId } = useSelector((state: RootState) => state.auth);
  const [listItems, setListItems] = useState<ListItem[]>([]);
  const [loading, setLoading] = useState(false);

  const getStoreName = useCallback((): ListStoreName => {
    if (chatType === 'chat') return CHAT_LIST_STORE;
    if (chatType === 'group') return GROUP_STORE;
    return ANNOUNCEMENT_STORE;
  }, [chatType]);

  /**
   * Fetches unread count for a specific item based on chat type
   */
  const getUnreadCount = useCallback(async (itemId: string): Promise<number> => {
    if (!userId) return 0;

    try {
      if (chatType === 'chat') {
        return await getUnreadChatMessagesCount(userId, itemId);
      } else if (chatType === 'group') {
        return await getUnreadGroupMessagesCount(userId, itemId);
      } else {
        return await getUnreadAnnouncementMessagesCount(userId, itemId);
      }
    } catch (error) {
      console.error('Error fetching unread count:', error);
      return 0;
    }
  }, [userId, chatType]);

  /**
   * Fetches unread counts for all items in the list
   */
  const fetchUnreadCounts = useCallback(async (items: ContactListItem[]): Promise<ListItem[]> => {
    const itemsWithUnread = await Promise.all(
      items.map(async (item) => ({
        ...item,
        unreadCount: await getUnreadCount(item.id),
      }))
    );
    return itemsWithUnread;
  }, [getUnreadCount]);

  useEffect(() => {
    const fetchAndStoreItems = async () => {
      if (!userId) return; // Don't run if user is not logged in

      setLoading(true);
      const storeName = getStoreName();

      // 1. Load from IndexedDB first for quick display with unread counts
      try {
        const cachedItems = await getItems(userId, storeName);
        if (cachedItems.length > 0) {
          const itemsWithUnread = await fetchUnreadCounts(cachedItems);
          setListItems(itemsWithUnread);
        }
      } catch (error) {
        console.error('Error loading from IndexedDB:', error);
      }

      // 2. Fetch from network and update DB/UI
      try {
        let endpoint = '';
        if (chatType === 'chat') endpoint = '/user/users/college';
        else if (chatType === 'group') endpoint = '/groups/member-of/chat';
        else endpoint = '/groups/member-of/announcement';

        const response = await getData(endpoint);
        let networkItems: Array<{ id: string; name: string; profilePicture: string | null; }> = [];

        if (chatType === 'chat') {
          networkItems = response.data.map((user: any) => ({
            id: user._id,
            name: user.username,
            profilePicture: user.profile_picture || null,
          }));
        } else {
          networkItems = response.data.map((group: any) => ({
            id: group.id,
            name: group.name,
            profilePicture: group.icon || null,
          }));
        }

        await upsertItems(userId, storeName, networkItems);
        const updatedItems = await getItems(userId, storeName);
        const itemsWithUnread = await fetchUnreadCounts(updatedItems);
        setListItems(itemsWithUnread);

      } catch (error) {
        console.error(`Error fetching ${chatType}s:`, error);
      } finally {
        setLoading(false);
      }
    };

    fetchAndStoreItems();
  }, [chatType, getStoreName, userId, fetchUnreadCounts, lastUpdated]);

  const handleItemClick = async (id: string) => {
    dispatch(setChatId(id));

    // Mark messages as read when chat is opened
    if (!userId) return;

    try {
      if (chatType === 'chat') {
        await markChatRead(userId, id);
      } else if (chatType === 'group') {
        await markGroupRead(userId, id);
      } else {
        await markAnnouncementRead(userId, id);
      }

      // Update the unread count for this item to 0
      setListItems(prevItems =>
        prevItems.map(item =>
          item.id === id ? { ...item, unreadCount: 0 } : item
        )
      );
    } catch (error) {
      console.error('Error marking messages as read:', error);
    }
  };

  const handleTabClick = (type: 'chat' | 'group' | 'announcement') => {
    dispatch(setChatType(type));
    dispatch(setChatId(null));
  };

  // Theme-aware styling
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

  return (
    <div className="flex flex-col h-full">
      {/* Tab selection */}
      <div className="flex justify-around" style={tabContainerStyle}>
        <button
          className="px-4 py-2 rounded-md font-medium"
          style={chatType === 'chat' ? activeTabStyle : inactiveTabStyle}
          onClick={() => handleTabClick('chat')}
        >
          Chat
        </button>
        <button
          className="px-4 py-2 rounded-md font-medium"
          style={chatType === 'group' ? activeTabStyle : inactiveTabStyle}
          onClick={() => handleTabClick('group')}
        >
          Group
        </button>
        <button
          className="px-4 py-2 rounded-md font-medium"
          style={chatType === 'announcement' ? activeTabStyle : inactiveTabStyle}
          onClick={() => handleTabClick('announcement')}
        >
          Announcement
        </button>
      </div>

      {/* List content based on selected tab */}
      <div className="flex-grow overflow-y-auto">
        {loading && listItems.length === 0 ? (
          <div className="flex justify-center items-center h-full">
            <p style={{ color: theme === 'dark' ? 'white' : 'black' }}>Loading...</p>
          </div>
        ) : (
          <div>
            {listItems.map(item => <ChatItem key={item.id} {...item} onClick={() => handleItemClick(item.id)} />)}
          </div>
        )}
      </div>
    </div>
  );
};

export default ChatLeftPanel;


