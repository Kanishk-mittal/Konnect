import React, { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import type { RootState } from '../store/store';
import { putEncryptedData } from '../api/requests'; // Assuming putEncryptedData exists
import InputComponent from './InputComponent';
import Title from './Title';

interface EditClubModalProps {
    isOpen: boolean;
    onClose: () => void;
    clubId: string;
    currentName: string;
    currentEmail: string;
    onSuccess: () => void;
}

const EditClubModal: React.FC<EditClubModalProps> = ({
    isOpen,
    onClose,
    clubId,
    currentName,
    currentEmail,
    onSuccess,
}) => {
    const theme = useSelector((state: RootState) => state.theme.theme);
    const [formState, setFormState] = useState({
        newName: currentName,
        newEmail: currentEmail,
    });
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (isOpen) {
            setFormState({
                newName: currentName,
                newEmail: currentEmail,
            });
            setError(null);
        }
    }, [isOpen, currentName, currentEmail]);

    if (!isOpen) {
        return null;
    }

    const handleSave = async () => {
        if (isSaving) return;

        if (formState.newName.trim() === '' && formState.newEmail.trim() === '') {
            setError('At least one field must be filled.');
            return;
        }

        if (formState.newName === currentName && formState.newEmail === currentEmail) {
            onClose();
            return;
        }

        setIsSaving(true);
        setError(null);

        try {
            const payload: any = { clubId };
            if (formState.newName !== currentName) payload.newName = formState.newName;
            if (formState.newEmail !== currentEmail) payload.newEmail = formState.newEmail;
            
            await putEncryptedData('/club/update-details', payload);
            onSuccess();
            onClose();
        } catch (err: any) {
            const message = err.response?.data?.message || 'Failed to update club details.';
            setError(message);
            console.error('Error updating club:', err);
        } finally {
            setIsSaving(false);
        }
    };

    const modalBgColor = theme === 'light' ? 'bg-white' : 'bg-gray-800';
    const textColor = theme === 'light' ? 'text-black' : 'text-white';

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
            <div className={`p-6 rounded-lg shadow-xl ${modalBgColor} ${textColor} w-full max-w-md`}>
                <h2 className="text-2xl font-bold mb-4 text-center">Edit Club</h2>
                
                {error && <p className="text-red-500 text-sm mb-4">{error}</p>}

                <div className="space-y-4">
                    <InputComponent
                        label="Club Name"
                        state={formState}
                        setState={setFormState}
                        keyName="newName"
                        width={100}
                    />
                    <InputComponent
                        label="Club Email"
                        type="email"
                        state={formState}
                        setState={setFormState}
                        keyName="newEmail"
                        width={100}
                    />
                </div>

                <div className="flex justify-end gap-4 mt-6">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 rounded-md bg-gray-300 text-black hover:bg-gray-400 transition-colors"
                        disabled={isSaving}
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSave}
                        className="px-4 py-2 rounded-md bg-blue-600 text-white hover:bg-blue-700 transition-colors disabled:opacity-50"
                        disabled={isSaving}
                    >
                        {isSaving ? 'Saving...' : 'Save'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default EditClubModal;
