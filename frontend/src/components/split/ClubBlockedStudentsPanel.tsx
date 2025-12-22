import React from 'react';
import type { NavigateFunction } from 'react-router-dom';
import StudentTab from '../StudentTab';

interface Student {
    id: string;
    rollNumber: string;
    name: string;
    profilePicture: string | null;
    isBlocked: boolean;
}

interface ClubBlockedStudentsPanelProps {
    blockedStudents: Student[];
    blockedStudentsLoading: boolean;
    textColor: string;
    theme: 'light' | 'dark';
    navigate: NavigateFunction;
    topRightSectionColor: string;
}

const ClubBlockedStudentsPanel: React.FC<ClubBlockedStudentsPanelProps> = ({
    blockedStudents,
    blockedStudentsLoading,
    textColor,
    theme,
    navigate,
    topRightSectionColor
}) => {
    return (
        <div className="rounded-lg p-4 h-full w-full flex flex-col panel-minimized overflow-hidden" style={{ backgroundColor: topRightSectionColor }}>
            <h2 className={`text-xl font-bold mb-4 ${theme === 'dark' ? 'text-white' : 'text-black'} panel-title`}>
                Blocked Students ({blockedStudents.length})
            </h2>

            <div className="panel-content flex flex-col flex-grow overflow-hidden">
                <div className="flex-grow overflow-y-auto min-h-0 student-list-container">
                    {blockedStudentsLoading ? (
                        <div className={`text-center py-4 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                            Loading blocked students...
                        </div>
                    ) : blockedStudents.length === 0 ? (
                        <div className={`text-center py-4 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                            No blocked students
                        </div>
                    ) : (
                        blockedStudents.map((student) => (
                            <StudentTab
                                key={student.id}
                                id={student.id}
                                profilePicture={student.profilePicture}
                                rollNumber={student.rollNumber}
                                name={student.name}
                                isBlocked={student.isBlocked}
                            />
                        ))
                    )}
                </div>

                <div className="studentControlButtons flex gap-3 mt-4 justify-around">
                    <button
                        className="px-6 py-2 rounded-full text-white font-medium hover:opacity-80 transition-opacity"
                        style={{ backgroundColor: '#DC2626' }}
                        onClick={() => navigate('/club/block-students')}
                    >
                        Block Student
                    </button>
                    <button
                        className="px-6 py-2 rounded-full text-white font-medium hover:opacity-80 transition-opacity"
                        style={{ backgroundColor: '#22C55E' }}
                        onClick={() => navigate('/club/unblock-students')}
                    >
                        Unblock Student
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ClubBlockedStudentsPanel;
