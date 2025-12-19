import React, { useState } from 'react';
import { useSelector } from 'react-redux';
import type { RootState } from '../store/store';
import profileIcon from '../assets/profile_icon.png';
import announcementIcon from '../assets/announcement.png';
import sendIcon from '../assets/send.png';
import editIcon from '../assets/edit.png';
import deleteIcon from '../assets/delete.png';

interface GroupTabProps {
  id: string;
  name: string;
  icon: string | null;
  type: 'chat' | 'announcement' | 'both';
  onEdit?: () => void;
  onDelete?: () => void;
}

const GroupTab: React.FC<GroupTabProps> = ({
  id,
  name,
  icon,
  type,
  onEdit,
  onDelete
}) => {
  const theme = useSelector((state: RootState) => state.theme.theme);
  const [isDeleting, setIsDeleting] = useState(false);

  // Define theme-specific styles
  const backgroundColor = theme === 'light'
    ? 'rgba(255, 158, 0, 0.4)'  // FF9E00 with 0.4 alpha
    : 'rgba(85, 44, 157, 0.4)';  // 552C9D with 0.4 alpha

  const borderColor = theme === 'light' ? '#FF9E00' : 'transparent';
  const borderWidth = theme === 'light' ? '2px' : '0px';
  const textColor = theme === 'light' ? '#000000' : '#FFFFFF';

  // Invert icon colors for dark theme
  const iconFilter = theme === 'dark' ? 'invert(1)' : 'none';

  const handleDelete = async () => {
    if (isDeleting) return;

    if (window.confirm(`Are you sure you want to delete the group "${name}"?`)) {
      setIsDeleting(true);
      try {
        if (onDelete) {
          await onDelete();
        }
      } catch (error) {
        console.error('Error deleting group:', error);
      } finally {
        setIsDeleting(false);
      }
    }
  };

  return (
    <div
      className="flex flex-row justify-around items-center gap-2 p-1 rounded-lg m-1"
      style={{
        backgroundColor: backgroundColor,
        border: `${borderWidth} solid ${borderColor}`,
        color: textColor,
      }}
    >
      {/* Group Picture */}
      <div className="flex-shrink-0">
        <img
          src={icon || profileIcon}
          alt="Group"
          className="w-12 h-12 rounded-full object-cover"
        />
      </div>

      {/* Group Name */}
      <div className="flex-1 min-w-0">
        <span className="text-sm font-medium truncate">{name}</span>
      </div>

      {/* Group Type Icons */}
      <div className="flex gap-1">
        {(type === 'announcement' || type === 'both') && (
          <button
            className="flex-shrink-0 p-2 rounded-md hover:opacity-80 transition-opacity"
            style={{ backgroundColor: 'rgba(255, 255, 255, 0.2)' }}
          >
            <img
              src={announcementIcon}
              alt="Announcement"
              className="w-5 h-5"
              style={{ filter: iconFilter }}
            />
          </button>
        )}
        {(type === 'chat' || type === 'both') && (
          <button
            className="flex-shrink-0 p-2 rounded-md hover:opacity-80 transition-opacity"
            style={{ backgroundColor: 'rgba(255, 255, 255, 0.2)' }}
          >
            <img
              src={sendIcon}
              alt="Chat"
              className="w-5 h-5"
              style={{ filter: iconFilter }}
            />
          </button>
        )}
      </div>

      {/* Edit Button */}
      <button
        onClick={onEdit}
        className="flex-shrink-0 p-2 rounded-md hover:opacity-80 transition-opacity"
        disabled={isDeleting}
        style={{ backgroundColor: 'rgba(255, 255, 255, 0.2)' }}
      >
        <img
          src={editIcon}
          alt="Edit"
          className="w-5 h-5"
          style={{ filter: iconFilter, opacity: isDeleting ? 0.5 : 1 }}
        />
      </button>

      {/* Delete Button */}
      <button
        onClick={handleDelete}
        className="flex-shrink-0 p-2 rounded-md hover:opacity-80 transition-opacity"
        disabled={isDeleting}
        style={{ backgroundColor: 'rgba(255, 255, 255, 0.2)' }}
      >
        <img
          src={deleteIcon}
          alt="Delete"
          className="w-5 h-5"
          style={{ filter: iconFilter, opacity: isDeleting ? 0.5 : 1 }}
        />
      </button>
    </div>
  );
};

export default GroupTab;
