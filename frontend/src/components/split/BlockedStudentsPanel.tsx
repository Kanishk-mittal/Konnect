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

interface BlockedStudentsPanelProps {
    blockedStudents: Student[];
    blockedStudentsLoading: boolean;
    textColor: string;
    theme: 'light' | 'dark';
    navigate: NavigateFunction;
    topRightSectionColor: string;
}

const BlockedStudentsPanel: React.FC<BlockedStudentsPanelProps> = ({
    blockedStudents,
    blockedStudentsLoading,
    textColor,
    theme,
    navigate,
    topRightSectionColor
}) => {
    return (
        <div className="rounded-lg p-4 h-full w-full flex flex-col gap-1 panel-minimized" style={{ backgroundColor: topRightSectionColor }}>
            <h2 className={`text-xl font-bold mb-4 ${theme === 'dark' ? 'text-[#FFA4A4]' : 'text-[#FF0404]'} panel-title`}>
                Blocked Students
            </h2>

            <div className="panel-content">
                {/* Blocked Students List */}
                <div className="flex-grow overflow-y-auto">
                    {blockedStudentsLoading ? (
                        <div className="text-center py-4">
                            <span className={textColor}>Loading blocked students...</span>
                        </div>
                    ) : blockedStudents.length > 0 ? (
                        blockedStudents.map(student => (
                            <StudentTab
                                key={student.id}
                                id={student.id}
                                profilePicture={student.profilePicture}
                                rollNumber={student.rollNumber}
                                name={student.name}
                                isBlocked={student.isBlocked}
                            />
                        ))
                    ) : (
                        <div className="text-center py-4">
                            <span className={textColor}>No blocked students found</span>
                        </div>
                    )}
                </div>

                {/* Block/Unblock Control Buttons */}
                <div className="blockedControlButtons flex gap-3 mt-4 justify-around">
                    <button
                        className="px-6 py-2 rounded-full text-white font-medium hover:opacity-80 transition-opacity"
                        style={{ backgroundColor: '#FF2424' }}
                        onClick={() => navigate('/admin/block-students')}
                    >
                        Block Multiple
                    </button>
                    <button
                        className="px-6 py-2 rounded-full text-white font-medium hover:opacity-80 transition-opacity"
                        style={{ backgroundColor: '#38B000' }}
                        onClick={() => navigate('/admin/unblock-students')}
                    >
                        Unblock Multiple
                    </button>
                </div>
            </div>
        </div>
    );
};

export default BlockedStudentsPanel;