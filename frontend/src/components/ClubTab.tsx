import React, { useState } from 'react';
import { useSelector } from 'react-redux';
import type { RootState } from '../store/store';
import profileIcon from '../assets/profile_icon.png';
import sendIcon from '../assets/send.png';
import editIcon from '../assets/edit.png';
import deleteIcon from '../assets/delete.png';

interface ClubTabProps {
    id: string;
    name: string;
    email: string;
    onEdit?: () => void;
    onDelete?: () => void;
    onSendMessage?: () => void;
}

const ClubTab: React.FC<ClubTabProps> = ({
    id,
    name,
    email,
    onEdit,
    onDelete,
    onSendMessage
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

        if (window.confirm(`Are you sure you want to delete the club "${name}"?`)) {
            setIsDeleting(true);
            try {
                if (onDelete) {
                    await onDelete();
                }
            } catch (error) {
                console.error('Error deleting club:', error);
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
            {/* Club Picture */}
            <div className="flex-shrink-0">
                <img
                    src={profileIcon}
                    alt="Club"
                    className="w-12 h-12 rounded-full object-cover"
                />
            </div>

            {/* Club Name and Email */}
            <div className="flex-1 min-w-0">
                <div className="text-sm font-medium truncate">{name}</div>
                <div className="text-xs opacity-75 truncate">{email}</div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-shrink-0 gap-1">
                {/* Send Message Button */}
                {onSendMessage && (
                    <button
                        onClick={onSendMessage}
                        className="p-2 rounded-md hover:opacity-80 transition-opacity"
                        style={{ backgroundColor: 'rgba(255, 255, 255, 0.2)' }}
                        title="Send Message"
                    >
                        <img
                            src={sendIcon}
                            alt="Send Message"
                            className="w-5 h-5"
                            style={{ filter: iconFilter }}
                        />
                    </button>
                )}

                {/* Edit Button */}
                {onEdit && (
                    <button
                        onClick={onEdit}
                        className="p-2 rounded-md hover:opacity-80 transition-opacity"
                        style={{ backgroundColor: 'rgba(255, 255, 255, 0.2)' }}
                        title="Edit Club"
                    >
                        <img
                            src={editIcon}
                            alt="Edit"
                            className="w-5 h-5"
                            style={{ filter: iconFilter }}
                        />
                    </button>
                )}

                {/* Delete Button */}
                {onDelete && (
                    <button
                        onClick={handleDelete}
                        disabled={isDeleting}
                        className="p-2 rounded-md hover:opacity-80 transition-opacity disabled:opacity-50"
                        style={{ backgroundColor: 'rgba(255, 255, 255, 0.2)' }}
                        title="Delete Club"
                    >
                        <img
                            src={deleteIcon}
                            alt="Delete"
                            className="w-5 h-5"
                            style={{ filter: iconFilter }}
                        />
                    </button>
                )}
            </div>
        </div>
    );
};

export default ClubTab;
