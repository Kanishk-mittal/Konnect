import React from 'react';
import type { NavigateFunction } from 'react-router-dom';
import SearchBox from '../SearchBox';
import StudentTab from '../StudentTab';

interface Member {
    id: string;
    rollNumber: string;
    name: string;
    profilePicture: string | null;
    isBlocked: boolean;
    position?: string;
}

interface ClubMembersPanelProps {
    members: Member[];
    membersLoading: boolean;
    memberSearchText: string;
    setMemberSearchText: (text: string) => void;
    textColor: string;
    theme: 'light' | 'dark';
    navigate: NavigateFunction;
    leftSectionColor: string;
    clubId?: string; // Add clubId prop
}

const ClubMembersPanel: React.FC<ClubMembersPanelProps> = ({
    members,
    membersLoading,
    memberSearchText,
    setMemberSearchText,
    textColor,
    navigate,
    leftSectionColor,
    clubId
}) => {
    return (
        <div className="rounded-lg p-4 h-full w-full flex flex-col gap-1 panel-minimized overflow-hidden" style={{ backgroundColor: leftSectionColor }}>
            <h2 className={`text-xl font-bold mb-4 ${textColor} panel-title`}>Club Members ({members.length})</h2>

            <div className="panel-content flex flex-col flex-grow overflow-hidden">
                <SearchBox
                    searchText={memberSearchText}
                    setSearchText={setMemberSearchText}
                    placeholder="Search members..."
                />

                {/* Member List */}
                <div className="flex-grow overflow-y-auto mt-1 min-h-0 student-list-container">
                    {membersLoading ? (
                        <div className="text-center py-4">
                            <span className={textColor}>Loading members...</span>
                        </div>
                    ) : members.length > 0 ? (
                        members.map(member => (
                            <StudentTab
                                key={member.id}
                                id={member.id}
                                profilePicture={member.profilePicture}
                                rollNumber={member.rollNumber}
                                name={member.name}
                                isBlocked={member.isBlocked}
                                position={member.position}
                                context="club"
                                clubId={clubId}
                            />
                        ))
                    ) : (
                        <div className="text-center py-4">
                            <span className={textColor}>
                                {memberSearchText ? 'No members found matching your search' : 'No members in this club yet'}
                            </span>
                        </div>
                    )}
                </div>

                <div className="studentControlButtons flex gap-3 mt-4 justify-around">
                    <button
                        className="px-6 py-2 rounded-full text-white font-medium hover:opacity-80 transition-opacity"
                        style={{ backgroundColor: '#5A189A' }}
                        onClick={() => navigate('/club/add-member')}
                    >
                        Add Member
                    </button>
                    <button
                        className="px-6 py-2 rounded-full text-white font-medium hover:opacity-80 transition-opacity"
                        style={{ backgroundColor: '#FF2424' }}
                        onClick={() => navigate('/club/remove-member')}
                    >
                        Remove Member
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ClubMembersPanel;
