import React, { useState } from 'react';
import { useSelector } from 'react-redux';
import type { RootState } from '../store/store';
import profileIcon from '../assets/profile_icon.png';
import sendIcon from '../assets/send.png';
import editIcon from '../assets/edit.png';
import deleteIcon from '../assets/delete.png';
import { deleteEncryptedData, postEncryptedData } from '../api/requests';
import EditPositionModal from './EditPositionModal';

interface StudentTabProps {
  id: string;
  profilePicture: string | null;
  rollNumber: string;
  name: string;
  isBlocked: boolean;
  position?: string;
  context?: 'admin' | 'club'; // Context to determine which delete endpoint to use
  clubId?: string; // Required when context is 'club'
}

const StudentTab: React.FC<StudentTabProps> = ({
  id,
  profilePicture,
  rollNumber,
  name,
  isBlocked,
  position,
  context = 'admin', // Default to admin context
  clubId
}) => {
  const theme = useSelector((state: RootState) => state.theme.theme);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  // Define theme-specific styles with red tint for blocked students
  let backgroundColor, borderColor;

  if (isBlocked) {
    // Red tinted background for blocked students
    backgroundColor = theme === 'light'
      ? 'rgba(255, 100, 100, 0.4)'  // Red tint for light theme
      : 'rgba(139, 69, 69, 0.4)';   // Dark red tint for dark theme
  } else {
    // Normal colors for unblocked students
    backgroundColor = theme === 'light'
      ? 'rgba(255, 158, 0, 0.4)'  // FF9E00 with 0.4 alpha
      : 'rgba(85, 44, 157, 0.4)';  // 552C9D with 0.4 alpha
  }

  borderColor = theme === 'light' ? (isBlocked ? '#FF6464' : '#FF9E00') : 'transparent';
  const borderWidth = theme === 'light' ? '2px' : '0px';
  const textColor = theme === 'light' ? '#000000' : '#FFFFFF';

  // Invert icon colors for dark theme
  const iconFilter = theme === 'dark' ? 'invert(1)' : 'none';

  return (
    <>
    <div
      className="flex flex-row justify-around items-center gap-2 p-1 rounded-lg m-1"
      style={{
        backgroundColor: backgroundColor,
        border: `${borderWidth} solid ${borderColor}`,
        color: textColor,
      }}
    >
      {/* Profile Picture */}
      <div className="flex-shrink-0">
        <img
          src={profilePicture || profileIcon}
          alt="Profile"
          className="w-12 h-12 rounded-full object-cover"
        />
      </div>

      {/* Roll Number */}
      <div className="flex-shrink-0 min-w-0">
        <span className="text-sm font-medium truncate">{rollNumber}</span>
      </div>

      {/* Name */}
      <div className="flex-1 min-w-0">
        <span className="text-sm font-medium truncate">{name}</span>
        {position && (
          <span className="text-xs opacity-75 ml-2">({position})</span>
        )}
      </div>

      {/* Block/Unblock Button */}
      <button
        onClick={() => {
          // Use different API endpoints based on context
          if (context === 'club') {
            if (isBlocked) {
              // Unblock student for club (remove from club's blocked list)
              if (!clubId) {
                alert('Club ID is required');
                return;
              }
              postEncryptedData('/club/students/unblock', {
                studentId: id,
                clubId: clubId
              })
                .then(() => {
                  alert(`Student ${name} unblocked successfully!`);
                  window.location.reload();
                })
                .catch((error: any) => {
                  console.error('Error unblocking student:', error);
                  alert(`Failed to unblock student: ${error.response?.data?.message || 'Unknown error'}`);
                });
            } else {
              // Block student for club (add to club's blocked list)
              alert('Please use the Block Students page to block students.');
            }
          } else {
            // Admin context - use toggle endpoint
            postEncryptedData('/student/toggle-block', {
              studentId: id
            })
              .then(() => {
                alert(`Student ${isBlocked ? 'unblocked' : 'blocked'} successfully!`);
                window.location.reload();
              })
              .catch((error: any) => {
                console.error('Error toggling student block status:', error);
                alert(`Failed to ${isBlocked ? 'unblock' : 'block'} student: ${error.response?.data?.message || 'Unknown error'}`);
              });
          }
        }}
        className="flex-shrink-0 px-3 py-2 rounded-md text-white text-sm font-medium hover:opacity-80 transition-opacity"
        style={{ backgroundColor: isBlocked ? '#38B000' : '#FF3437' }}
      >
        {isBlocked ? 'Unblock' : 'Block'}
      </button>

      {/* Action Buttons - Only show if student is not blocked */}
      {!isBlocked && (
        <div className="flex flex-shrink-0 gap-1">
          {/* Send Button */}
          <button
            onClick={() => console.log('Send clicked for', name, 'ID:', id)}
            className="p-2 rounded-md hover:opacity-80 transition-opacity"
            style={{ backgroundColor: 'rgba(255, 255, 255, 0.2)' }}
          >
            <img src={sendIcon} alt="Send" className="w-5 h-5" style={{ filter: iconFilter }} />
          </button>

          {/* Edit Button */}
          <button
            onClick={() => {
              if (context === 'club' && position !== undefined) {
                // Open edit position modal for club members
                setIsEditModalOpen(true);
              } else {
                console.log('Edit clicked for', name, 'ID:', id);
              }
            }}
            className="p-2 rounded-md hover:opacity-80 transition-opacity"
            style={{ backgroundColor: 'rgba(255, 255, 255, 0.2)' }}
          >
            <img src={editIcon} alt="Edit" className="w-5 h-5" style={{ filter: iconFilter }} />
          </button>

          {/* Delete Button */}
          <button
            onClick={() => {
              const confirmMessage = context === 'club'
                ? `Are you sure you want to remove ${name} (${rollNumber}) from the club?`
                : `Are you sure you want to delete ${name} (${rollNumber})?`;

              if (window.confirm(confirmMessage)) {
                setIsDeleting(true);

                if (context === 'club' && clubId) {
                  // Remove from club membership
                  deleteEncryptedData('/club/members/remove', {
                    studentId: id,
                    clubId: clubId
                  })
                    .then(() => {
                      alert(`Member ${name} removed from club successfully!`);
                      window.location.reload();
                    })
                    .catch((error: any) => {
                      console.error('Error removing member from club:', error);
                      alert(`Failed to remove member: ${error.response?.data?.message || 'Unknown error'}`);
                    })
                    .finally(() => {
                      setIsDeleting(false);
                    });
                } else {
                  // Delete student from system (admin context)
                  deleteEncryptedData('/student/delete', {
                    studentId: id
                  })
                    .then(() => {
                      alert(`Student ${name} deleted successfully!`);
                      window.location.reload();
                    })
                    .catch((error: any) => {
                      console.error('Error deleting student:', error);
                      alert(`Failed to delete student: ${error.response?.data?.message || 'Unknown error'}`);
                    })
                    .finally(() => {
                      setIsDeleting(false);
                    });
                }
              }
            }}
            disabled={isDeleting}
            className="p-2 rounded-md hover:opacity-80 transition-opacity"
            style={{ backgroundColor: 'rgba(255, 255, 255, 0.2)' }}
          >
            <img src={deleteIcon} alt="Delete" className="w-5 h-5" style={{ filter: iconFilter }} />
          </button>
        </div>
      )}
    </div>

    {/* Edit Position Modal */}
    {context === 'club' && clubId && position !== undefined && (
      <EditPositionModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        studentId={id}
        studentName={name}
        currentPosition={position}
        clubId={clubId}
        onSuccess={() => {
          alert('Position updated successfully!');
          window.location.reload();
        }}
      />
    )}
    </>
  );
};

export default StudentTab;
