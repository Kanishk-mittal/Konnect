import React, { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import type { RootState } from '../store/store';
import { putEncryptedData } from '../api/requests';

interface EditPositionModalProps {
    isOpen: boolean;
    onClose: () => void;
    studentId: string;
    studentName: string;
    currentPosition: string;
    clubId: string;
    onSuccess: () => void;
}

const EditPositionModal: React.FC<EditPositionModalProps> = ({
    isOpen,
    onClose,
    studentId,
    studentName,
    currentPosition,
    clubId,
    onSuccess
}) => {
    const theme = useSelector((state: RootState) => state.theme.theme);
    const [position, setPosition] = useState(currentPosition);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        setPosition(currentPosition);
        setError('');
    }, [isOpen, currentPosition]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (!position.trim()) {
            setError('Position cannot be empty');
            return;
        }

        setIsLoading(true);
        setError('');

        try {
            await putEncryptedData('/club/members/update-position', {
                clubId,
                studentId,
                position: position.trim()
            });

            onSuccess();
            onClose();
        } catch (err: any) {
            console.error('Error updating position:', err);
            setError(err.response?.data?.message || 'Failed to update position');
        } finally {
            setIsLoading(false);
        }
    };

    if (!isOpen) return null;

    const backgroundColor = theme === 'dark' ? '#1a1a2e' : '#ffffff';
    const textColor = theme === 'dark' ? '#ffffff' : '#000000';
    const overlayColor = theme === 'dark' ? 'rgba(0, 0, 0, 0.8)' : 'rgba(0, 0, 0, 0.5)';

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center"
            style={{ backgroundColor: overlayColor }}
            onClick={onClose}
        >
            <div
                className="rounded-lg shadow-xl p-6 w-full max-w-md"
                style={{ backgroundColor, color: textColor }}
                onClick={(e) => e.stopPropagation()}
            >
                <h2 className="text-2xl font-bold mb-4">Edit Position</h2>
                
                <p className="mb-4 opacity-75">
                    Update position for <strong>{studentName}</strong>
                </p>

                <form onSubmit={handleSubmit}>
                    <div className="mb-4">
                        <label className="block mb-2 font-medium">
                            Position
                        </label>
                        <input
                            type="text"
                            value={position}
                            onChange={(e) => setPosition(e.target.value)}
                            className="w-full px-4 py-2 rounded-lg border"
                            style={{
                                backgroundColor: theme === 'dark' ? '#2a2a3e' : '#f5f5f5',
                                borderColor: theme === 'dark' ? '#444' : '#ccc',
                                color: textColor
                            }}
                            placeholder="e.g., President, Secretary, Member"
                            disabled={isLoading}
                        />
                    </div>

                    {error && (
                        <div className="mb-4 p-3 rounded-lg bg-red-500 bg-opacity-20 text-red-500 border border-red-500">
                            {error}
                        </div>
                    )}

                    <div className="flex gap-3 justify-end">
                        <button
                            type="button"
                            onClick={onClose}
                            disabled={isLoading}
                            className="px-4 py-2 rounded-lg font-medium hover:opacity-80 transition-opacity"
                            style={{
                                backgroundColor: theme === 'dark' ? '#444' : '#ddd',
                                color: textColor
                            }}
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={isLoading}
                            className="px-4 py-2 rounded-lg font-medium text-white hover:opacity-80 transition-opacity"
                            style={{
                                backgroundColor: isLoading ? '#666' : '#4CAF50'
                            }}
                        >
                            {isLoading ? 'Updating...' : 'Update Position'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default EditPositionModal;
