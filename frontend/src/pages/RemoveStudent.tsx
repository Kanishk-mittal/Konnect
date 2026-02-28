import { useState } from 'react';
import { useSelector } from 'react-redux';
import type { RootState } from '../store/store';
import { useNavigate } from 'react-router-dom';
import Header from "../components/Header";
import CsvUploader from "../components/CsvUploader";
import ManualEntryTable from "../components/ManualEntryTable";
import { deleteEncryptedData } from '../api/requests';

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

const RemoveStudent = () => {
    // Navigation and theme
    const navigate = useNavigate();
    const theme = useSelector((state: RootState) => state.theme.theme);
    const adminDetails = useSelector((state: RootState) => state.auth.adminDetails);

    // Table column for roll number entry (simplified compared to AddStudent)
    const tableColumns = [
        { key: 'rollNumber' as keyof Student, label: 'Roll Number', type: 'text' as const }
    ];

    // Student data state
    const [students, setStudents] = useState<Student[]>([{
        rollNumber: '',
        name: '', // Required by Student type but not used for removal
        emailId: '' // Required by Student type but not used for removal
    }]);
    const [wrongValues, setWrongValues] = useState<WrongValue[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');
    const [successMessage, setSuccessMessage] = useState('');

    // Handle student removal
    const handleSubmit = async () => {
        if (!adminDetails?.collegeCode) {
            setErrorMessage('Admin college code not found. Please log in again.');
            return;
        }

        setIsLoading(true);
        setErrorMessage('');
        setSuccessMessage('');

        // Check for empty roll numbers
        const emptyErrors = checkEmptyValues(students);
        setWrongValues(emptyErrors);

        if (emptyErrors.length > 0) {
            alert('Please enter roll numbers for all rows.');
            setIsLoading(false);
            return;
        }

        try {
            // Extract roll numbers
            const rollNumbers = students
                .map(s => s.rollNumber.trim())
                .filter(Boolean);

            if (rollNumbers.length === 0) {
                setErrorMessage('Please enter at least one roll number.');
                setIsLoading(false);
                return;
            }

            // Send request to backend
            const response = await deleteEncryptedData(
                '/student/delete-multiple',
                { collegeCode: adminDetails.collegeCode, rollNumbers }
            );

            if (response && response.status === true) {
                const { removedCount, notFound } = response;

                if (removedCount > 0) {
                    setSuccessMessage(`Successfully removed ${removedCount} student${removedCount > 1 ? 's' : ''}.`);
                } else {
                    setErrorMessage('No students were found with the provided roll numbers.');
                }

                if (notFound?.length > 0) {
                    setErrorMessage(`${errorMessage ? errorMessage + ' ' : ''}Could not find students with these roll numbers: ${notFound.join(', ')}`);
                }

                // Clear form if at least one student was removed
                if (removedCount > 0) {
                    setStudents([{
                        rollNumber: '',
                        name: '',  // Required by Student type but not used
                        emailId: '' // Required by Student type but not used
                    }]);
                    setWrongValues([]);
                }
            } else {
                setErrorMessage(response?.message || 'An error occurred while removing students.');
            }
        } catch (error: any) {
            const errorMsg = error?.response?.data?.message || error?.message || 'An unexpected error occurred.';
            setErrorMessage(errorMsg);
        } finally {
            setIsLoading(false);
        }
    };

    // Define theme-specific colors (match AddStudent/AdminDashboard)
    const backgroundGradient = theme === 'dark'
        ? 'linear-gradient(180deg, #000000 0%, #0E001B 8%)'
        : 'linear-gradient(180deg, #9435E5 0%, #FFD795 8%)';

    const textColor = theme === 'dark' ? 'text-white' : 'text-black';

    const headerBackground = theme === 'dark'
        ? {}
        : { background: 'radial-gradient(circle, rgba(255, 255, 255, 0.4) 0%, rgba(255, 255, 255, 0) 100%)' };

    return (
        <div className="flex flex-col" style={{ background: backgroundGradient }}>
            {/* Header */}
            <div style={headerBackground}>
                <Header />
            </div>
            {/* Main Content */}
            <div className="flex-grow flex flex-col p-6">
                <div className="flex items-center justify-between mb-6">
                    <h1 className={`text-3xl font-bold ${textColor}`}>Remove Students</h1>
                    <button
                        className="px-4 py-2 flex items-center gap-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white transition-colors"
                        onClick={() => navigate('/admin/dashboard')}
                    >
                        Back to Dashboard
                    </button>
                </div>
                {/* Message Display */}
                {(errorMessage || successMessage) && (
                    <div className={`p-4 rounded-lg text-center font-medium mb-4 ${errorMessage
                        ? (theme === 'dark' ? 'bg-red-900/30 text-red-300 border border-red-700' : 'bg-red-100 text-red-700 border border-red-300')
                        : (theme === 'dark' ? 'bg-green-900/30 text-green-300 border border-green-700' : 'bg-green-100 text-green-700 border border-green-300')
                        }`}>
                        {errorMessage || successMessage}
                    </div>
                )}
                <div className="max-w-2xl mx-auto">
                    {/* CSV Uploader */}
                    <CsvUploader
                        columns={['Roll Number']}
                        setStudents={(uploadedData) => {
                            // Make TypeScript happy by checking if it's an array
                            if (Array.isArray(uploadedData)) {
                                const formattedData = uploadedData.map((item: any) => ({
                                    rollNumber: item.rollNumber || '',
                                    name: '', // Required by Student type but not used for removal
                                    emailId: '' // Required by Student type but not used for removal
                                }));
                                setStudents(formattedData);
                            }
                        }}
                        message="Upload a CSV file with column 'Roll Number' (column header must match exactly)"
                        theme={theme as 'light' | 'dark'}
                    />
                    {/* Manual Entry Table */}
                    <div className="mt-8">
                        <ManualEntryTable
                            theme={theme as 'light' | 'dark'}
                            columns={tableColumns}
                            students={students}
                            setStudents={setStudents}
                            wrongValues={wrongValues}
                            setWrongValues={setWrongValues}
                        />
                        <div className="mt-6 flex justify-center">
                            <button
                                onClick={handleSubmit}
                                disabled={isLoading}
                                className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:bg-gray-400"
                            >
                                {isLoading ? 'Processing...' : 'Remove Students'}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default RemoveStudent;