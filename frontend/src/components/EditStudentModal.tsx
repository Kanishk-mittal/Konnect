import React, { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import type { RootState } from '../store/store';
import { postData, getData } from '../api/requests';

interface EditStudentModalProps {
    isOpen: boolean;
    onClose: () => void;
    studentId: string;
    studentName: string;
    studentRollNumber: string;
    studentEmail: string;
    onSuccess: () => void;
}

const EditStudentModal: React.FC<EditStudentModalProps> = ({
    isOpen,
    onClose,
    studentId,
    studentName,
    studentRollNumber,
    studentEmail,
    onSuccess
}) => {
    const theme = useSelector((state: RootState) => state.theme.theme);

    const [name, setName] = useState(studentName);
    const [rollNumber, setRollNumber] = useState(studentRollNumber);
    const [email, setEmail] = useState(studentEmail);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    useEffect(() => {
        if (isOpen && studentId && !studentEmail) {
            const fetchEmail = async () => {
                try {
                    const response = await getData(`/user/email/${studentId}`);
                    if (response.status && response.data?.email) {
                        setEmail(response.data.email);
                    }
                } catch (err) {
                    console.error('Failed to fetch student email:', err);
                }
            };
            fetchEmail();
        } else if (isOpen && studentEmail) {
            setEmail(studentEmail);
        }
    }, [isOpen, studentId, studentEmail]);

    if (!isOpen) return null;

    const handleUpdate = async () => {
        if (!name.trim() || !rollNumber.trim() || !email.trim()) {
            setError('All fields are required');
            return;
        }

        setIsLoading(true);
        setError('');

        try {
            const response = await postData('/student/update', {
                userId: studentId,
                fullName: name.trim(),
                rollNumber: rollNumber.trim(),
                email: email.trim()
            });

            if (response.status) {
                setSuccess('Student details updated successfully!');
                setTimeout(() => {
                    setSuccess('');
                    onSuccess();
                }, 2000);
            }
        } catch (err: any) {
            setError(err.response?.data?.message || 'Failed to update student details');
        } finally {
            setIsLoading(false);
        }
    };

    const backgroundColor = theme === 'dark' ? '#1a1a2e' : '#ffffff';
    const textColor = theme === 'dark' ? '#ffffff' : '#000000';
    const inputBg = theme === 'dark' ? '#2a2a3e' : '#f5f5f5';
    const borderColor = theme === 'dark' ? '#444' : '#ccc';

    const inputStyle = {
        backgroundColor: inputBg,
        borderColor,
        color: textColor
    };

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center"
            style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}
            onClick={onClose}
        >
            <div
                className="rounded-lg shadow-xl p-6 w-full max-w-lg"
                style={{ backgroundColor, color: textColor }}
                onClick={(e) => e.stopPropagation()}
            >
                <h2 className="text-2xl font-bold mb-4">Edit Student</h2>

                {error && (
                    <div className="mb-4 p-3 rounded-lg bg-red-100 border border-red-400" style={{ color: '#dc2626' }}>
                        {error}
                    </div>
                )}
                {success && (
                    <div className="mb-4 p-3 rounded-lg bg-green-100 border border-green-400" style={{ color: '#16a34a' }}>
                        {success}
                    </div>
                )}

                <div className="space-y-4">
                    <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="w-full px-4 py-2 rounded-lg border"
                        style={inputStyle}
                        placeholder="Full Name"
                        disabled={isLoading}
                    />
                    <input
                        type="text"
                        value={rollNumber}
                        onChange={(e) => setRollNumber(e.target.value)}
                        className="w-full px-4 py-2 rounded-lg border"
                        style={inputStyle}
                        placeholder="Roll Number"
                        disabled={isLoading}
                    />
                    <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full px-4 py-2 rounded-lg border"
                        style={inputStyle}
                        placeholder="Email ID"
                        disabled={isLoading}
                    />
                </div>

                <div className="flex justify-end gap-4 mt-6">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 rounded-lg border hover:opacity-80 transition-opacity"
                        style={{ backgroundColor: '#ddd', color: '#000' }}
                        disabled={isLoading}
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleUpdate}
                        className="px-4 py-2 rounded-lg text-white hover:opacity-80 transition-opacity"
                        style={{ backgroundColor: isLoading ? '#666' : '#4CAF50' }}
                        disabled={isLoading}
                    >
                        {isLoading ? 'Updating...' : 'Update'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default EditStudentModal;