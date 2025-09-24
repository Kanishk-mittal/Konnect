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

// Simple validator to check that roll numbers are provided
const checkEmptyValues = (students: Student[]): WrongValue[] => {
    return students
        .map((student, index) => {
            const emptyColumns: (keyof Student)[] = [];

            if (!student.rollNumber?.trim()) {
                emptyColumns.push('rollNumber');
            }

            return emptyColumns.length > 0 ? { row: index, emptyColumns } : null;
        })
        .filter(Boolean) as WrongValue[];
};

const UnblockStudents = () => {
    // Navigation and theme
    const navigate = useNavigate();
    const theme = useSelector((state: RootState) => state.theme.theme);
    const adminDetails = useSelector((state: RootState) => state.auth.adminDetails);

    // Table column for roll number entry (simplified similar to RemoveStudent)
    const tableColumns = [
        { key: 'rollNumber' as keyof Student, label: 'Roll Number', type: 'text' as const }
    ];

    // Student data state
    const [students, setStudents] = useState<Student[]>([{
        rollNumber: '',
        name: '', // Required by Student type but not used for unblocking
        emailId: '' // Required by Student type but not used for unblocking
    }]);
    const [wrongValues, setWrongValues] = useState<WrongValue[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');
    const [successMessage, setSuccessMessage] = useState('');

    // Handle student unblocking
    const handleUnblockStudents = async () => {
        if (!adminDetails?.collegeCode) {
            setErrorMessage('Admin college code not found. Please log in again.');
            return;
        }

        // Clear previous messages
        setErrorMessage('');
        setSuccessMessage('');
        setWrongValues([]);

        // Validate students data
        const validationErrors = checkEmptyValues(students);
        if (validationErrors.length > 0) {
            setWrongValues(validationErrors);
            setErrorMessage(`Please fill in all required fields for the highlighted rows.`);
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
            // Extract roll numbers from valid students
            const rollNumbers = validStudents.map(s => s.rollNumber.trim());

            // Unblock the students using encrypted API
            const response = await postEncryptedData('/student/unblock-multiple', {
                rollNumbers: rollNumbers
            });

            if (response.status) {
                setSuccessMessage(`Successfully unblocked ${response.data.unblockedCount} student(s).`);
                // Clear the form
                setStudents([{
                    rollNumber: '',
                    name: '',
                    emailId: ''
                }]);
                // Navigate back to admin dashboard after a short delay
                setTimeout(() => {
                    navigate('/admin/dashboard');
                }, 1500);
            } else {
                setErrorMessage(response.message || 'Failed to unblock students.');
            }
        } catch (error: any) {
            console.error('Error unblocking students:', error);
            setErrorMessage(error.response?.data?.message || error.message || 'An unexpected error occurred while unblocking students.');
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
        <div className="flex flex-col h-screen" style={{ background: backgroundGradient }}>
            <div style={headerBackground}>
                <Header editProfileUrl="/admin/edit-profile" />
            </div>

            <div className="flex-grow flex flex-col p-4">
                <div className="flex justify-between items-center mb-4">
                    <h1 className={`text-3xl font-bold ${textColor}`}>Unblock Students</h1>
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
                                columns={['Roll Number']}
                                setStudents={(uploadedData) => {
                                    // Make TypeScript happy by checking if it's an array
                                    if (Array.isArray(uploadedData)) {
                                        const formattedData = uploadedData.map((item: any) => ({
                                            rollNumber: item.rollNumber || '',
                                            name: '', // Required by Student type but not used for unblocking
                                            emailId: '' // Required by Student type but not used for unblocking
                                        }));
                                        setStudents(formattedData);
                                    }
                                }}
                                message="Upload a CSV file with column 'Roll Number' (column header must match exactly)"
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
                                onClick={handleUnblockStudents}
                                disabled={isLoading}
                                className={`px-8 py-3 rounded-lg font-medium text-white transition-all ${isLoading
                                    ? 'bg-gray-400 cursor-not-allowed'
                                    : 'bg-green-600 hover:bg-green-700'
                                    }`}
                            >
                                {isLoading ? 'Unblocking Students...' : 'Unblock Students'}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default UnblockStudents;