import React from 'react';
import type { NavigateFunction } from 'react-router-dom';
import SearchBox from '../SearchBox';
import StudentTab from '../StudentTab';

interface Student {
    id: string;
    rollNumber: string;
    name: string;
    profilePicture: string | null;
    isBlocked: boolean;
}

interface AllStudentsPanelProps {
    students: Student[];
    studentsLoading: boolean;
    studentSearchText: string;
    setStudentSearchText: (text: string) => void;
    textColor: string;
    theme: 'light' | 'dark';
    navigate: NavigateFunction;
    leftSectionColor: string;
}

const AllStudentsPanel: React.FC<AllStudentsPanelProps> = ({
    students,
    studentsLoading,
    studentSearchText,
    setStudentSearchText,
    textColor,
    navigate,
    leftSectionColor
}) => {
    return (
        <div className="rounded-lg p-4 h-full w-full flex flex-col gap-1 panel-minimized overflow-hidden" style={{ backgroundColor: leftSectionColor }}>
            <h2 className={`text-xl font-bold mb-4 ${textColor} panel-title`}>All Students</h2>

            <div className="panel-content flex flex-col flex-grow overflow-hidden">
                <SearchBox
                    searchText={studentSearchText}
                    setSearchText={setStudentSearchText}
                    placeholder="Search students..."
                />

                {/* Student List */}
                <div className="flex-grow overflow-y-auto mt-1 min-h-0 student-list-container">
                    {studentsLoading ? (
                        <div className="text-center py-4">
                            <span className={textColor}>Loading students...</span>
                        </div>
                    ) : students.length > 0 ? (
                        students.map(student => (
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
                            <span className={textColor}>
                                {studentSearchText ? 'No students found matching your search' : 'No student added'}
                            </span>
                        </div>
                    )}
                </div>

                <div className="studentControlButtons flex gap-3 mt-4 justify-around">
                    <button
                        className="px-6 py-2 rounded-full text-white font-medium hover:opacity-80 transition-opacity"
                        style={{ backgroundColor: '#5A189A' }}
                        onClick={() => navigate('/admin/add-student')}
                    >
                        Add Student
                    </button>
                    <button
                        className="px-6 py-2 rounded-full text-white font-medium hover:opacity-80 transition-opacity"
                        style={{ backgroundColor: '#FF2424' }}
                        onClick={() => navigate('/admin/remove-student')}
                    >
                        Remove Student
                    </button>
                </div>
            </div>
        </div>
    );
};

export default AllStudentsPanel;