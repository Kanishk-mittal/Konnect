import React, { useState } from 'react';
import { useSelector } from 'react-redux';
import type { RootState } from '../store/store';
import { deleteEncryptedData } from '../api/requests';

// Define a simplified CSV Uploader component for roll numbers
const RollNumberCsvUploader = ({
    theme = 'light',
    setRollNumbers
}: {
    theme: 'light' | 'dark',
    setRollNumbers: React.Dispatch<React.SetStateAction<string[]>>
}) => {
    const [file, setFile] = useState<File | null>(null);
    const [isDragOver, setIsDragOver] = useState(false);

    // Define theme colors
    const dropzoneColor = theme === 'dark' ? '#1f2937' : '#FFC362';
    const textColor = theme === 'dark' ? 'text-white' : 'text-black';
    const borderColor = theme === 'dark' ? 'border-gray-600' : 'border-gray-300';

    const handleFileDrop = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        setIsDragOver(false);

        const droppedFile = e.dataTransfer.files[0];
        if (droppedFile && (droppedFile.type === 'text/csv' || droppedFile.name.endsWith('.csv'))) {
            setFile(droppedFile);
        }
    };

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = e.target.files?.[0];
        if (selectedFile && (selectedFile.type === 'text/csv' || selectedFile.name.endsWith('.csv'))) {
            setFile(selectedFile);
        }
    };

    const processFile = async () => {
        if (!file) return;

        try {
            const text = await file.text();
            // Parse CSV - expect either a single column of roll numbers or a column named "Roll Number"
            const lines = text.split('\n').filter(line => line.trim());

            // Try to detect header and use appropriate column
            const headerLine = lines[0]?.toLowerCase();
            let rollNumberIndex = 0; // Default to first column

            // If header contains "roll", use that column
            if (headerLine?.includes('roll')) {
                const headers = headerLine.split(',').map(h => h.trim());
                rollNumberIndex = headers.findIndex(h => h.includes('roll'));
                lines.shift(); // Remove header
            }

            // Extract roll numbers
            const rollNumbers = lines
                .map(line => {
                    const columns = line.split(',');
                    return columns[rollNumberIndex]?.trim();
                })
                .filter(Boolean) as string[];

            setRollNumbers(rollNumbers);
            setFile(null);
        } catch (error) {
            console.error('Error processing CSV:', error);
            alert('Error processing CSV file. Please check the format.');
        }
    };

    return (
        <div className="mb-4">
            <div
                onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
                onDragLeave={() => setIsDragOver(false)}
                onDrop={handleFileDrop}
                className={`
          p-4 border-2 border-dashed rounded-lg text-center cursor-pointer
          ${isDragOver ? 'border-blue-500' : borderColor}
        `}
                style={{ backgroundColor: dropzoneColor }}
                onClick={() => document.getElementById('roll-number-file')?.click()}
            >
                <p className={textColor}>Drop a CSV file with roll numbers or click to upload</p>
                <input
                    id="roll-number-file"
                    type="file"
                    accept=".csv"
                    onChange={handleFileSelect}
                    className="hidden"
                />
            </div>

            {file && (
                <div className="mt-2">
                    <div className="flex justify-between items-center">
                        <span className={textColor}>{file.name}</span>
                        <button
                            onClick={processFile}
                            className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600"
                        >
                            Process
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

// Manual entry component for roll numbers
const RollNumberManualEntry = ({
    theme = 'light',
    rollNumbers,
    setRollNumbers
}: {
    theme: 'light' | 'dark',
    rollNumbers: string[],
    setRollNumbers: React.Dispatch<React.SetStateAction<string[]>>
}) => {
    const [inputValue, setInputValue] = useState('');
    const textColor = theme === 'dark' ? 'text-white' : 'text-black';
    const bgColor = theme === 'dark' ? 'bg-gray-800' : 'bg-white';

    const addRollNumber = () => {
        if (inputValue.trim()) {
            setRollNumbers(prev => [...prev, inputValue.trim()]);
            setInputValue('');
        }
    };

    const removeRollNumber = (index: number) => {
        setRollNumbers(prev => prev.filter((_, i) => i !== index));
    };

    return (
        <div>
            <div className="mb-3">
                <h3 className={`text-lg font-semibold ${textColor}`}>Enter Roll Numbers Manually</h3>
                <div className="flex mt-2">
                    <input
                        type="text"
                        value={inputValue}
                        onChange={(e) => setInputValue(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && addRollNumber()}
                        className={`flex-1 px-3 py-2 border rounded-l ${theme === 'dark' ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'}`}
                        placeholder="Enter roll number"
                    />
                    <button
                        onClick={addRollNumber}
                        className="px-4 py-2 bg-blue-500 text-white rounded-r hover:bg-blue-600"
                    >
                        Add
                    </button>
                </div>
            </div>

            {rollNumbers.length > 0 && (
                <div className={`border rounded p-3 max-h-40 overflow-y-auto ${theme === 'dark' ? 'border-gray-600' : 'border-gray-300'} ${bgColor}`}>
                    <div className="flex justify-between mb-2">
                        <h4 className={`font-medium ${textColor}`}>Roll Numbers to Remove ({rollNumbers.length})</h4>
                        <button
                            onClick={() => setRollNumbers([])}
                            className="text-red-500 hover:text-red-700 text-sm"
                        >
                            Clear All
                        </button>
                    </div>
                    <ul>
                        {rollNumbers.map((roll, index) => (
                            <li key={index} className="flex justify-between items-center py-1">
                                <span className={textColor}>{roll}</span>
                                <button
                                    onClick={() => removeRollNumber(index)}
                                    className="text-red-500 hover:text-red-700"
                                >
                                    &times;
                                </button>
                            </li>
                        ))}
                    </ul>
                </div>
            )}
        </div>
    );
};

// Main RemoveStudents modal component
const RemoveStudentsModal = ({
    isOpen,
    onClose,
    onRemove,
    collegeCode
}: {
    isOpen: boolean,
    onClose: () => void,
    onRemove: (removedIds: string[]) => void,
    collegeCode: string
}) => {
    const theme = useSelector((state: RootState) => state.theme.theme);
    const [rollNumbers, setRollNumbers] = useState<string[]>([]);
    const [isProcessing, setIsProcessing] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');
    const [removedStudentIds, setRemovedStudentIds] = useState<string[]>([]);

    const handleRemoveStudents = async () => {
        if (rollNumbers.length === 0) {
            setErrorMessage('Please enter at least one roll number');
            return;
        }

        setIsProcessing(true);
        setErrorMessage('');

        try {
            // Find students by roll numbers and delete them
            const response = await deleteEncryptedData('/student/delete-multiple', {
                collegeCode,
                rollNumbers
            });

            if (response && response.status) {
                // If successful, show the count of removed students
                const { removedCount, notFound } = response;
                if (removedCount > 0) {
                    // Notify the parent component that students were removed
                    onRemove([]);  // We don't have IDs anymore, parent should refresh
                    setRemovedStudentIds([]);  // Just to update UI
                    setRollNumbers([]);
                } else {
                    setErrorMessage('No students were found with the provided roll numbers.');
                }

                // Show warning for roll numbers not found
                if (notFound && notFound.length > 0) {
                    setErrorMessage(`Could not find students with these roll numbers: ${notFound.join(', ')}`);
                }
            } else {
                setErrorMessage(response?.message || 'Failed to remove students');
            }
        } catch (error: any) {
            console.error('Error removing students:', error);
            setErrorMessage(error?.response?.data?.message || error?.message || 'An error occurred');
        } finally {
            setIsProcessing(false);
        }
    };

    if (!isOpen) return null;

    const textColor = theme === 'dark' ? 'text-white' : 'text-black';
    const modalBgColor = theme === 'dark' ? 'bg-gray-900' : 'bg-white';

    return (
        <div className="fixed inset-0 flex items-center justify-center z-50 bg-black bg-opacity-50">
            <div className={`${modalBgColor} p-6 rounded-lg shadow-lg max-w-md w-full`}>
                <div className="flex justify-between items-center mb-4">
                    <h2 className={`text-xl font-bold ${textColor}`}>Remove Students</h2>
                    <button onClick={onClose} className={`${textColor} text-2xl`}>&times;</button>
                </div>

                {errorMessage && (
                    <div className="mb-4 p-3 bg-red-100 text-red-700 rounded border border-red-300">
                        {errorMessage}
                    </div>
                )}

                {removedStudentIds.length > 0 && (
                    <div className="mb-4 p-3 bg-green-100 text-green-700 rounded border border-green-300">
                        Successfully removed {removedStudentIds.length} student{removedStudentIds.length > 1 ? 's' : ''}
                    </div>
                )}

                <p className={`mb-4 ${textColor}`}>
                    Enter roll numbers of students to remove, or upload a CSV file containing roll numbers.
                </p>

                <RollNumberCsvUploader
                    theme={theme as 'light' | 'dark'}
                    setRollNumbers={setRollNumbers}
                />

                <RollNumberManualEntry
                    theme={theme as 'light' | 'dark'}
                    rollNumbers={rollNumbers}
                    setRollNumbers={setRollNumbers}
                />

                <div className="flex justify-end gap-3 mt-6">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleRemoveStudents}
                        disabled={isProcessing || rollNumbers.length === 0}
                        className={`px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed`}
                    >
                        {isProcessing ? 'Processing...' : 'Remove Students'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default RemoveStudentsModal;