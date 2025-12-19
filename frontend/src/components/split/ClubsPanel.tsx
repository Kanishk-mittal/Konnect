import React from 'react';
import type { NavigateFunction } from 'react-router-dom';
import ClubTab from '../ClubTab';

interface Club {
    id: string;
    name: string;
    email: string;
}

interface ClubsPanelProps {
    theme: 'light' | 'dark';
    backgroundColor: string;
    navigate: NavigateFunction;
    clubs: Club[];
    clubsLoading: boolean;
    textColor: string;
}

const ClubsPanel: React.FC<ClubsPanelProps> = ({
    theme,
    backgroundColor,
    navigate,
    clubs,
    clubsLoading,
    textColor
}) => {
    const handleEdit = (clubId: string) => {
        navigate(`/admin/edit-club/${clubId}`);
    };

    const handleDelete = async (clubId: string) => {
        // TODO: Implement delete functionality
        console.log('Delete club:', clubId);
    };

    const handleSendMessage = (clubId: string) => {
        // TODO: Implement send message functionality
        console.log('Send message to club:', clubId);
    };

    return (
        <div className="rounded-lg p-4 h-full w-full flex flex-col panel-minimized overflow-hidden" style={{ backgroundColor }}>
            <h2 className={`text-xl font-bold mb-4 ${theme === 'dark' ? 'text-white' : 'text-black'} panel-title`}>
                Clubs ({clubs.length})
            </h2>

            <div className="panel-content flex flex-col flex-grow overflow-hidden">
                <div className="flex-grow overflow-y-auto min-h-0 student-list-container">
                    {clubsLoading ? (
                        <div className={`text-center py-4 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                            Loading clubs...
                        </div>
                    ) : clubs.length === 0 ? (
                        <div className={`text-center py-4 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                            No clubs found. Create your first club!
                        </div>
                    ) : (
                        clubs.map((club) => (
                            <ClubTab
                                key={club.id}
                                id={club.id}
                                name={club.name}
                                email={club.email}
                                onEdit={() => handleEdit(club.id)}
                                onDelete={() => handleDelete(club.id)}
                                onSendMessage={() => handleSendMessage(club.id)}
                            />
                        ))
                    )}
                </div>

                <div className="clubControlButtons flex gap-3 mt-4 justify-center">
                    <button
                        className="px-6 py-2 rounded-full text-white font-medium hover:opacity-80 transition-opacity"
                        style={{ backgroundColor: '#22C55E' }}
                        onClick={() => navigate('/admin/add-club')}
                    >
                        Add Club
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ClubsPanel;