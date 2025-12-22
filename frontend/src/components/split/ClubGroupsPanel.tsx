import React from 'react';
import type { NavigateFunction } from 'react-router-dom';
import GroupTab from '../GroupTab';
import { deleteEncryptedData } from '../../api/requests';

interface Group {
    id: string;
    name: string;
    description: string;
    icon: string | null;
    type: 'chat' | 'announcement';
    memberCount: number;
    adminCount?: number;
    createdAt: string;
}

interface ClubGroupsPanelProps {
    theme: 'light' | 'dark';
    backgroundColor: string;
    navigate: NavigateFunction;
    groups: Group[];
    groupsLoading: boolean;
    textColor: string;
}

const ClubGroupsPanel: React.FC<ClubGroupsPanelProps> = ({
    theme,
    backgroundColor,
    navigate,
    groups,
    groupsLoading,
    textColor
}) => {
    // Group groups by name to handle both chat and announcement types
    const groupedGroups = groups.reduce((acc, group) => {
        const existing = acc.find(g => g.name === group.name);
        if (existing) {
            if (existing.type === 'chat' && group.type === 'announcement') {
                existing.type = 'both';
                existing.announcementId = group.id;
            } else if (existing.type === 'announcement' && group.type === 'chat') {
                existing.type = 'both';
                existing.chatId = group.id;
            }
        } else {
            acc.push({
                ...group,
                chatId: group.type === 'chat' ? group.id : undefined,
                announcementId: group.type === 'announcement' ? group.id : undefined,
                type: group.type as 'chat' | 'announcement' | 'both'
            });
        }
        return acc;
    }, [] as Array<Group & { type: 'chat' | 'announcement' | 'both'; chatId?: string; announcementId?: string }>);

    const handleEdit = (groupId: string) => {
        navigate(`/club/edit-group/${groupId}`);
    };

    const handleDelete = async (groupId: string, groupType: 'chat' | 'announcement' | 'both') => {
        try {
            await deleteEncryptedData(`/groups/delete/${groupId}`, {
                groupType: groupType
            });
            alert('Group deleted successfully!');
            window.location.reload();
        } catch (error: any) {
            console.error('Error deleting group:', error);
            alert(`Failed to delete group: ${error.response?.data?.message || 'Unknown error'}`);
        }
    };

    return (
        <div className="rounded-lg p-4 h-full w-full flex flex-col panel-minimized overflow-hidden" style={{ backgroundColor }}>
            <h2 className={`text-xl font-bold mb-4 ${theme === 'dark' ? 'text-white' : 'text-black'} panel-title`}>
                Groups ({groupedGroups.length})
            </h2>

            <div className="panel-content flex flex-col flex-grow overflow-hidden">
                <div className="flex-grow overflow-y-auto min-h-0 student-list-container">
                    {groupsLoading ? (
                        <div className={`text-center py-4 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                            Loading groups...
                        </div>
                    ) : groupedGroups.length === 0 ? (
                        <div className={`text-center py-4 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                            No groups found. Create your first group!
                        </div>
                    ) : (
                        groupedGroups.map((group) => (
                            <GroupTab
                                key={group.id}
                                id={group.id}
                                name={group.name}
                                icon={group.icon}
                                type={group.type}
                                onEdit={() => handleEdit(group.id)}
                                onDelete={() => handleDelete(group.id, group.type)}
                            />
                        ))
                    )}
                </div>

                <div className="groupControlButtons flex gap-3 mt-4 justify-center">
                    <button
                        className="px-6 py-2 rounded-full text-white font-medium hover:opacity-80 transition-opacity"
                        style={{ backgroundColor: '#22C55E' }}
                        onClick={() => navigate('/club/add-group')}
                    >
                        Add Group
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ClubGroupsPanel;
