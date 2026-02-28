import React, { useState } from 'react';
import { useSelector } from 'react-redux';
import type { RootState } from '../store/store';
import profileIcon from '../assets/profile_icon.png';
import announcementIcon from '../assets/announcement.png';
import sendIcon from '../assets/send.png';
import editIcon from '../assets/edit.png';
import deleteIcon from '../assets/delete.png';
import { deleteEncryptedData } from '../api/requests';

interface GroupTabProps {
  id: string;
  chatId?: string;
  announcementId?: string;
  name: string;
  icon: string | null;
  type: 'chat' | 'announcement' | 'both';
  onEdit?: () => void;
  onDelete?: () => void;
}

const GroupTab: React.FC<GroupTabProps> = ({
  id,
  chatId,
  announcementId,
  name,
  icon,
  type,
  onEdit,
  onDelete
}) => {
  const theme = useSelector((state: RootState) => state.theme.theme);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  // Define theme-specific styles
  const backgroundColor = theme === 'light'
    ? 'rgba(255, 158, 0, 0.4)'  // FF9E00 with 0.4 alpha
    : 'rgba(85, 44, 157, 0.4)';  // 552C9D with 0.4 alpha

  const borderColor = theme === 'light' ? '#FF9E00' : 'transparent';
  const borderWidth = theme === 'light' ? '2px' : '0px';
  const textColor = theme === 'light' ? '#000000' : '#FFFFFF';

  // Invert icon colors for dark theme
  const iconFilter = theme === 'dark' ? 'invert(1)' : 'none';

  const handleDeleteClick = () => {
    // If it's only one type, just show simple confirmation
    if (type === 'chat' || type === 'announcement') {
      if (window.confirm(`Are you sure you want to delete the ${type} group "${name}"?`)) {
        handleDeleteWithType(type);
      }
    } else {
      // If it's both, show modal to choose
      setShowDeleteModal(true);
    }
  };

  const handleDeleteWithType = async (groupType: 'chat' | 'announcement' | 'both') => {
    if (isDeleting) return;

    setIsDeleting(true);
    setShowDeleteModal(false);
    try {
      if (groupType === 'both') {
        await Promise.all([
          deleteEncryptedData(`/groups/chat/delete/${chatId || id}`, {}),
          deleteEncryptedData(`/groups/announcement/delete/${announcementId || id}`, {}),
        ]);
      } else if (groupType === 'chat') {
        await deleteEncryptedData(`/groups/chat/delete/${chatId || id}`, {});
      } else {
        await deleteEncryptedData(`/groups/announcement/delete/${announcementId || id}`, {});
      }
      if (onDelete) {
        onDelete();
      }
    } catch (error: any) {
      console.error('Error deleting group:', error);
      alert(`Failed to delete group: ${error.response?.data?.message || 'Unknown error'}`);
    } finally {
      setIsDeleting(false);
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
        onClick={handleDeleteClick}
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

      {/* Delete Modal */}
      {showDeleteModal && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
          onClick={() => setShowDeleteModal(false)}
        >
          <div
            className={`rounded-lg p-6 max-w-md w-full mx-4 ${theme === 'dark' ? 'bg-gray-800 text-white' : 'bg-white text-black'
              }`}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-xl font-bold mb-4">Delete Group "{name}"</h3>
            <p className="mb-6">Which type of group would you like to delete?</p>

            <div className="flex flex-col gap-3">
              <button
                onClick={() => handleDeleteWithType('chat')}
                className="px-4 py-3 bg-blue-500 text-white rounded-lg font-medium hover:bg-blue-600 transition-colors"
              >
                Delete Chat Group Only
              </button>

              <button
                onClick={() => handleDeleteWithType('announcement')}
                className="px-4 py-3 bg-orange-500 text-white rounded-lg font-medium hover:bg-orange-600 transition-colors"
              >
                Delete Announcement Group Only
              </button>

              <button
                onClick={() => handleDeleteWithType('both')}
                className="px-4 py-3 bg-red-500 text-white rounded-lg font-medium hover:bg-red-600 transition-colors"
              >
                Delete Both Groups
              </button>

              <button
                onClick={() => setShowDeleteModal(false)}
                className={`px-4 py-3 rounded-lg font-medium transition-colors ${theme === 'dark'
                    ? 'bg-gray-700 hover:bg-gray-600 text-white'
                    : 'bg-gray-200 hover:bg-gray-300 text-black'
                  }`}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GroupTab;
