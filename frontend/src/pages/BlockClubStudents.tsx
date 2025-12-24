import { useState, useRef } from 'react';
import { useSelector } from 'react-redux';
import type { RootState } from '../store/store';
import { useNavigate } from 'react-router-dom';
import Header from "../components/Header";
import ManualEntryTable from "../components/ManualEntryTable";
import { postEncryptedData } from '../api/requests';

// Student type for blocking (only needs roll number)
export type Student = { rollNumber: string; name?: string; emailId?: string };
export type WrongValue = { row: number; invalidColumns?: string[]; emptyColumns?: string[] };

const BlockClubStudents = () => {
    const navigate = useNavigate();
    const theme = useSelector((state: RootState) => state.theme.theme);
    const authState = useSelector((state: RootState) => state.auth);
    const { userId } = authState;
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [isDragOver, setIsDragOver] = useState(false);

    // Table columns for student entry (only roll number needed)
    const tableColumns: { key: keyof Student; label: string; type?: 'text' }[] = [
        { key: 'rollNumber', label: 'Roll Number', type: 'text' }
    ];

    // Student data state
    const [students, setStudents] = useState<Student[]>([]);
    const [wrongValues, setWrongValues] = useState<WrongValue[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');
    const [successMessage, setSuccessMessage] = useState('');
    const [files, setFiles] = useState<File[]>([]);

    // CSV Upload Handler
    const handleCsvSubmit = async () => {
        if (files.length === 0) {
            alert('Please select at least one CSV file');
            return;
        }
        try {
            const { csvToJson } = await import('../utils/csvParser');
            const { checkColumns } = await import('../utils/validator/csvValidator');
            let allStudents: Student[] = [];

            for (const file of files) {
                // Validate columns before parsing
                const columnCheck = await checkColumns(file, ['Roll Number']);
                if (!columnCheck.isValid) {
                    alert(`Missing required columns: ${columnCheck.missingColumns.join(', ')}`);
                    return;
                }
                const rows = await csvToJson(file);
                // Convert to student format
                const cleaned = rows.map(row => ({
                    rollNumber: row['Roll Number'] ?? ''
                }));
                allStudents = allStudents.concat(cleaned);
            }
            // Update state with parsed students
            setStudents(allStudents);
            setFiles([]);
        } catch (error) {
            alert('Error processing CSV files. Please check the file format and try again.');
        }
    };

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            setFiles(Array.from(e.target.files));
        }
    };

    const handleDragEnter = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragOver(true);
    };

    const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragOver(false);
    };

    const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
    };

    const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragOver(false);

        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            setFiles(Array.from(e.dataTransfer.files));
        }
    };

    // Check for empty values in student data
    const checkEmptyValues = (data: Student[]): WrongValue[] => {
        const wrongValues: WrongValue[] = [];

        data.forEach((student, index) => {
            const emptyColumns: (keyof Student)[] = [];

            if (!student.rollNumber || student.rollNumber.trim() === '') {
                emptyColumns.push('rollNumber');
            }

            if (emptyColumns.length > 0) {
                wrongValues.push({
                    row: index,
                    emptyColumns
                });
            }
        });

        return wrongValues;
    };

    // Handle form submission
    const handleSubmit = async () => {
        if (students.length === 0) {
            alert('Please add at least one student to block');
            return;
        }

        // Check for empty values
        const emptyValueErrors = checkEmptyValues(students);
        if (emptyValueErrors.length > 0) {
            setWrongValues(emptyValueErrors);
            setErrorMessage('Please fill in all required fields (highlighted in red)');
            return;
        }

        setIsLoading(true);
        setErrorMessage('');
        setSuccessMessage('');

        try {
            // Map frontend student data to backend format
            const studentsForBackend = students.map(s => ({
                roll: s.rollNumber.trim()
            }));

            const response = await postEncryptedData(
                '/club/students/block-bulk',
                {
                    students: studentsForBackend,
                    clubId: userId // Club ID from authenticated user
                },
                { expectEncryptedResponse: false }
            );

            if (response && response.status === true) {
                setSuccessMessage(response.message || 'Students blocked successfully!');
                setWrongValues([]);
                setStudents([]);

                // Navigate back to dashboard after delay
                setTimeout(() => {
                    navigate('/club/dashboard');
                }, 1500);
            } else {
                setErrorMessage(response?.message || 'Failed to block students');
            }
        } catch (error: any) {
            console.error('Error blocking students:', error);
            const errorMsg = error?.response?.data?.message || error?.message || 'An unexpected error occurred.';
            setErrorMessage(errorMsg);
        } finally {
            setIsLoading(false);
        }
    };

    // Define theme-specific colors
    const backgroundGradient = theme === 'dark'
        ? 'linear-gradient(180deg, #000000 0%, #0E001B 8%)'
        : 'linear-gradient(180deg, #9435E5 0%, #FFD795 8%)';

    const textColor = theme === 'dark' ? 'text-white' : 'text-black';

    const headerBackground = theme === 'dark'
        ? {}
        : { background: 'radial-gradient(circle, rgba(255, 255, 255, 0.4) 0%, rgba(255, 255, 255, 0) 100%)' };

    return (
        <div className="flex flex-col" style={{ background: backgroundGradient, minHeight: '100vh' }}>
            <div style={headerBackground}>
                <Header editProfileUrl="/club/edit-profile" />
            </div>
            <div className="flex-grow flex flex-col p-6 pb-12">
                <div className="flex items-center justify-between mb-6">
                    <h1 className={`text-3xl font-bold ${textColor}`}>Block Students</h1>
                    <button
                        className="px-4 py-2 flex items-center gap-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white transition-colors"
                        onClick={() => navigate('/club/dashboard')}
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

                <div className="max-w-2xl mx-auto space-y-8">
                    {/* Custom CSV Uploader for Students */}
                    <div
                        className={`${theme === 'dark'
                            ? 'bg-white/10 border-white/20'
                            : 'bg-white/20 border-white/40'
                            } backdrop-blur-lg rounded-lg shadow-xl border p-6`}
                    >
                        <h2 className={`text-2xl font-bold mb-4 ${theme === 'dark' ? 'text-white' : 'text-gray-800'}`}>
                            Upload CSV to Block Students
                        </h2>
                        <p className={`text-sm mb-4 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                            CSV should contain only: <strong>Roll Number</strong>
                        </p>

                        {/* Drag and Drop Zone */}
                        <div
                            onDragEnter={handleDragEnter}
                            onDragLeave={handleDragLeave}
                            onDragOver={handleDragOver}
                            onDrop={handleDrop}
                            onClick={() => fileInputRef.current?.click()}
                            className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${isDragOver
                                    ? 'border-blue-500 bg-blue-500/10'
                                    : theme === 'dark'
                                        ? 'border-gray-500 hover:border-gray-400'
                                        : 'border-gray-400 hover:border-gray-600'
                                }`}
                        >
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept=".csv"
                                multiple
                                onChange={handleFileSelect}
                                className="hidden"
                            />
                            <div className="space-y-2">
                                <p className={`text-lg ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                                    {files.length > 0 ? `${files.length} file(s) selected` : 'Drag and drop CSV files here'}
                                </p>
                                <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                                    or click to browse
                                </p>
                            </div>
                        </div>

                        {/* Selected Files List */}
                        {files.length > 0 && (
                            <div className="mt-4 space-y-2">
                                {files.map((file, index) => (
                                    <div key={index} className={`text-sm ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                                        📄 {file.name}
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Upload Button */}
                        <button
                            onClick={handleCsvSubmit}
                            disabled={files.length === 0}
                            className={`mt-4 w-full py-2 px-4 rounded-lg font-semibold transition-colors ${files.length === 0
                                    ? 'bg-gray-400 cursor-not-allowed'
                                    : theme === 'dark'
                                        ? 'bg-blue-600 hover:bg-blue-700 text-white'
                                        : 'bg-blue-500 hover:bg-blue-600 text-white'
                                }`}
                        >
                            Process CSV and Load Students
                        </button>
                    </div>

                    {/* Manual Entry Table */}
                    <div className="mt-8">
                        <ManualEntryTable
                            theme={theme as 'light' | 'dark'}
                            columns={tableColumns as any}
                            students={students as any}
                            setStudents={setStudents as any}
                            wrongValues={wrongValues}
                            setWrongValues={setWrongValues}
                        />
                    </div>

                    {/* Submit Button */}
                    {students.length > 0 && (
                        <div className="flex justify-center mt-6">
                            <button
                                onClick={handleSubmit}
                                disabled={isLoading}
                                className={`px-8 py-3 rounded-lg font-semibold text-white transition-colors ${isLoading
                                        ? 'bg-gray-400 cursor-not-allowed'
                                        : 'bg-red-600 hover:bg-red-700'
                                    }`}
                            >
                                {isLoading ? 'Blocking Students...' : `Block ${students.length} Student(s)`}
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default BlockClubStudents;
