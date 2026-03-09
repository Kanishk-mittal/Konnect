import React from 'react';
import { useSelector } from 'react-redux';
import type { RootState } from '../store/store';
import profileIcon from '../assets/profile_icon.png';

interface ChatItemProps {
  id: string;
  profilePicture: string | null;
  name: string;
  unreadCount: number;
  onClick: (id: string) => void;
}

const ChatItem: React.FC<ChatItemProps> = ({ id, profilePicture, name, unreadCount, onClick }) => {
  const theme = useSelector((state: RootState) => state.theme.theme);

  const backgroundColor = theme === 'light'
    ? 'rgba(255, 158, 0, 0.2)' // Lighter version of the tab color
    : 'rgba(85, 44, 157, 0.2)';

  const borderColor = theme === 'light' ? '#FF9E00' : 'transparent';
  const borderWidth = theme === 'light' ? '1px' : '0px';
  const textColor = theme === 'light' ? '#000000' : '#FFFFFF';

  return (
    <div
      className="flex flex-row items-center gap-3 p-2 rounded-lg m-1 cursor-pointer hover:bg-opacity-40"
      style={{
        backgroundColor: backgroundColor,
        border: `${borderWidth} solid ${borderColor}`,
        color: textColor,
      }}
      onClick={() => onClick(id)}
    >
      <img
        src={profilePicture || profileIcon}
        alt="Profile"
        className="w-10 h-10 rounded-full object-cover"
      />
      <div className="flex-1 min-w-0">
        <span className="text-sm font-medium truncate">{name}</span>
      </div>
      {unreadCount > 0 && (
        <div className="flex-shrink-0">
          <span className="text-xs font-bold text-white bg-red-500 rounded-full px-2 py-1">
            {unreadCount}
          </span>
        </div>
      )}
    </div>
  );
};

export default ChatItem;

