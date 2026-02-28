import { useState } from 'react';
import { useSelector } from 'react-redux';
import type { RootState } from '../store/store';
import { useNavigate } from 'react-router-dom';
import Header from "../components/Header";
import CsvUploader from "../components/CsvUploader";
import ManualEntryTable from "../components/ManualEntryTable";
import { postEncryptedData } from '../api/requests';

// Reuse Student type from AddStudent for consistency with components
import type { Student, WrongValue } from './AddStudent';

// Simple validator to check that roll numbers and reasons are provided
const checkEmptyValues = (students: Student[]): WrongValue[] => {
    return students
        .map((student, index) => {
            const emptyColumns: (keyof Student)[] = [];

            if (!student.rollNumber?.trim()) {
                emptyColumns.push('rollNumber');
            }
            if (!student.reason?.trim()) {
                emptyColumns.push('reason');
            }

            return emptyColumns.length > 0 ? { row: index, emptyColumns } : null;
        })
        .filter(Boolean) as WrongValue[];
};

const BlockStudents = () => {
    // Navigation and theme
    const navigate = useNavigate();
    const theme = useSelector((state: RootState) => state.theme.theme);

    // Table columns for roll number and block reason
    const tableColumns = [
        { key: 'rollNumber' as keyof Student, label: 'Roll Number', type: 'text' as const },
        { key: 'reason' as keyof Student, label: 'Reason', type: 'text' as const }
    ];

    // Student data state
    const [students, setStudents] = useState<Student[]>([{
        rollNumber: '',
        reason: '',
        name: '',
        emailId: ''
    }]);
    const [wrongValues, setWrongValues] = useState<WrongValue[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');
    const [successMessage, setSuccessMessage] = useState('');

    // Handle student blocking
    const handleBlockStudents = async () => {
        // Clear previous messages
        setErrorMessage('');
        setSuccessMessage('');
        setWrongValues([]);

        // Validate students data
        const validationErrors = checkEmptyValues(students);
        if (validationErrors.length > 0) {
            setWrongValues(validationErrors);
            setErrorMessage('Please fill in all required fields for the highlighted rows.');
            return;
        }

        // Get valid students (non-empty roll numbers)
        const validStudents = students.filter(student => student.rollNumber?.trim());
        if (validStudents.length === 0) {
            setErrorMessage('Please add at least one student with a roll number.');
            return;
        }

        setIsLoading(true);

        try {
            // Build payload matching backend schema: { students: [{ rollNumber, reason }] }
            const studentsPayload = validStudents.map(s => ({
                rollNumber: s.rollNumber.trim(),
                reason: s.reason?.trim() || ''
            }));

            const response = await postEncryptedData('/student/block-multiple', {
                students: studentsPayload
            });

            if (response.status) {
                const blockedCount = response.data?.blocked?.length ?? 0;
                setSuccessMessage(`Successfully blocked ${blockedCount} student(s).`);
                // Clear the form
                setStudents([{ rollNumber: '', reason: '', name: '', emailId: '' }]);
                setTimeout(() => {
                    navigate('/admin/dashboard');
                }, 1500);
            } else {
                setErrorMessage(response.message || 'Failed to block students.');
            }
        } catch (error: any) {
            console.error('Error blocking students:', error);
            setErrorMessage(error.response?.data?.message || error.message || 'An unexpected error occurred while blocking students.');
        } finally {
            setIsLoading(false);
        }
    };

    // Define theme-specific colors (match AddStudent/AdminDashboard)
    const backgroundGradient = theme === 'dark'
        ? 'linear-gradient(180deg, #000000 0%, #0E001B 8%)'
        : 'linear-gradient(180deg, #9435E5 0%, #FFD795 8%)';

    const textColor = theme === 'dark' ? 'text-white' : 'text-black';
    const cardBackground = theme === 'dark' ? '#1f2937' : '#FFC362';

    const headerBackground = theme === 'dark'
        ? {} // No background for dark theme
        : { background: 'radial-gradient(circle, rgba(255, 255, 255, 0.4) 0%, rgba(255, 255, 255, 0) 100%)' };

    return (
        <div className="flex flex-col" style={{ background: backgroundGradient, minHeight: '100vh' }}>
            <div style={headerBackground}>
                <Header editProfileUrl="/admin/edit-profile" />
            </div>

            <div className="flex-grow flex flex-col p-4 pb-12">
                <div className="flex justify-between items-center mb-4">
                    <h1 className={`text-3xl font-bold ${textColor}`}>Block Students</h1>
                    <button
                        onClick={() => navigate('/admin/dashboard')}
                        className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
                    >
                        Back to Dashboard
                    </button>
                </div>

                <div className="flex-grow rounded-lg p-6" style={{ backgroundColor: cardBackground }}>
                    <div className="space-y-6">
                        {/* CSV Upload Section */}
                        <div>
                            <h2 className={`text-xl font-semibold mb-3 ${textColor}`}>Upload CSV File</h2>
                            <CsvUploader
                                columns={['Roll Number', 'Reason']}
                                setStudents={(uploadedData) => {
                                    if (Array.isArray(uploadedData)) {
                                        const formattedData = uploadedData.map((item: any) => ({
                                            rollNumber: item.rollNumber || '',
                                            reason: item.reason || '',
                                            name: '',
                                            emailId: ''
                                        }));
                                        setStudents(formattedData);
                                    }
                                }}
                                message="Upload a CSV file with columns 'Roll Number', 'Reason' (column headers must match exactly)"
                                theme={theme as 'light' | 'dark'}
                            />
                        </div>

                        {/* Manual Entry Section */}
                        <div>
                            <h2 className={`text-xl font-semibold mb-3 ${textColor}`}>Manual Entry</h2>
                            <ManualEntryTable
                                theme={theme as 'light' | 'dark'}
                                columns={tableColumns}
                                students={students}
                                setStudents={setStudents}
                                wrongValues={wrongValues}
                                setWrongValues={setWrongValues}
                            />
                        </div>

                        {/* Messages */}
                        {errorMessage && (
                            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
                                {errorMessage}
                            </div>
                        )}

                        {successMessage && (
                            <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded">
                                {successMessage}
                            </div>
                        )}

                        {/* Action Button */}
                        <div className="flex justify-center">
                            <button
                                onClick={handleBlockStudents}
                                disabled={isLoading}
                                className={`px-8 py-3 rounded-lg font-medium text-white transition-all ${isLoading
                                    ? 'bg-gray-400 cursor-not-allowed'
                                    : 'bg-red-600 hover:bg-red-700'
                                    }`}
                            >
                                {isLoading ? 'Blocking Students...' : 'Block Students'}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default BlockStudents;