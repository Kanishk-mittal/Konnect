import React from 'react';
import { useSelector } from 'react-redux';
import type { RootState } from '../store/store';
import profileIcon from '../assets/profile_icon.png';
import sendIcon from '../assets/send.png';
import editIcon from '../assets/edit.png';
import deleteIcon from '../assets/delete.png';

interface StudentTabProps {
  id: string;
  profilePicture: string | null;
  rollNumber: string;
  name: string;
}

const StudentTab: React.FC<StudentTabProps> = ({
  id,
  profilePicture,
  rollNumber,
  name
}) => {
  const theme = useSelector((state: RootState) => state.theme.theme);
  
  // Define theme-specific styles
  const backgroundColor = theme === 'light' 
    ? 'rgba(255, 158, 0, 0.4)'  // FF9E00 with 0.4 alpha
    : 'rgba(85, 44, 157, 0.4)';  // 552C9D with 0.4 alpha
    
  const borderColor = theme === 'light' ? '#FF9E00' : 'transparent';
  const borderWidth = theme === 'light' ? '2px' : '0px';
  const textColor = theme === 'light' ? '#000000' : '#FFFFFF';
  
  // Invert icon colors for dark theme
  const iconFilter = theme === 'dark' ? 'invert(1)' : 'none';
  
  return (
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
      </div>
      
      {/* Block Button */}
      <button
        onClick={() => console.log('Block clicked for', name, 'ID:', id)}
        className="flex-shrink-0 px-3 py-2 rounded-md text-white text-sm font-medium hover:opacity-80 transition-opacity"
        style={{ backgroundColor: '#FF3437' }}
      >
        Block
      </button>
      
      {/* Action Buttons */}
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
          onClick={() => console.log('Edit clicked for', name, 'ID:', id)}
          className="p-2 rounded-md hover:opacity-80 transition-opacity"
          style={{ backgroundColor: 'rgba(255, 255, 255, 0.2)' }}
        >
          <img src={editIcon} alt="Edit" className="w-5 h-5" style={{ filter: iconFilter }} />
        </button>
        
        {/* Delete Button */}
        <button
          onClick={() => console.log('Delete clicked for', name, 'ID:', id)}
          className="p-2 rounded-md hover:opacity-80 transition-opacity"
          style={{ backgroundColor: 'rgba(255, 255, 255, 0.2)' }}
        >
          <img src={deleteIcon} alt="Delete" className="w-5 h-5" style={{ filter: iconFilter }} />
        </button>
      </div>
    </div>
  );
};

export default StudentTab;
