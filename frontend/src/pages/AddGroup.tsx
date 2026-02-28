import React, { useState } from 'react';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import type { RootState } from '../store/store';
import Header from '../components/Header';
import CsvUploader from '../components/CsvUploader';
import ManualEntryTable from '../components/ManualEntryTable';
import ImageInput from '../components/ImageInput';
import TokenInput from '../components/TokenInput';
import type { Student, WrongValue } from './AddStudent';
import { encryptAES, generateAESKey } from '../encryption/AES_utils';
import { encryptRSA, generateRSAKeyPair } from '../encryption/RSA_utils';
import { getData } from '../api/requests';
import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api';

interface GroupFormData {
    groupName: string;
    description: string;
    admins: string[];
    picture: File | null;
    members: Student[];
    isAnnouncementGroup: boolean;
    isChatGroup: boolean;
}

interface AddGroupProps {
    redirectUrl: string;
    editProfileUrl: string;
}

const AddGroup = ({ redirectUrl, editProfileUrl }: AddGroupProps) => {
    const navigate = useNavigate();
    const theme = useSelector((state: RootState) => state.theme.theme);

    const [formData, setFormData] = useState<GroupFormData>({
        groupName: '',
        description: '',
        admins: [],
        picture: null,
        members: [],
        isAnnouncementGroup: false,
        isChatGroup: false
    });

    const [members, setMembers] = useState<Student[]>([{
        rollNumber: '',
        name: '',
        emailId: ''
    }]);
    const [wrongValues, setWrongValues] = useState<WrongValue[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');
    const [successMessage, setSuccessMessage] = useState('');
    const [createdGroupsData, setCreatedGroupsData] = useState<Array<{ id: string; type: string; name: string; membersAdded: number }> | null>(null);

    // Define theme-specific colors
    const backgroundGradient = theme === 'dark'
        ? 'linear-gradient(180deg, #000000 0%, #0E001B 8%)'
        : 'linear-gradient(180deg, #9435E5 0%, #FFD795 8%)';

    const textColor = theme === 'dark' ? 'text-white' : 'text-black';
    const inputBgColor = theme === 'dark' ? '#1f2937' : '#ffffff';
    const borderColor = theme === 'dark' ? '#374151' : '#d1d5db';

    const headerBackground = theme === 'dark'
        ? {} // No background for dark theme
        : { background: 'radial-gradient(circle, rgba(255, 255, 255, 0.4) 0%, rgba(255, 255, 255, 0) 100%)' };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, checked } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: checked
        }));
    };

    const handleAdminsChange = (admins: string[]) => {
        setFormData(prev => ({
            ...prev,
            admins
        }));
    };



    // Table column for members (only roll number needed for groups)
    const tableColumns = [
        { key: 'rollNumber' as keyof Student, label: 'Roll Number', type: 'text' as const }
    ];

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        setIsLoading(true);
        setErrorMessage('');
        setSuccessMessage('');

        try {
            const validMembers = members.filter(member => member.rollNumber.trim() !== '');

            // Prepare the JSON payload
            const jsonPayload = {
                groupName: formData.groupName,
                description: formData.description,
                admins: formData.admins,
                members: validMembers.map(m => ({
                    rollNumber: m.rollNumber,
                })),
                isAnnouncementGroup: formData.isAnnouncementGroup,
                isChatGroup: formData.isChatGroup
            };

            // Get server's public key for encryption
            const { publicKey: serverPublicKey, keyId } = await getData('/encryption/rsa/publicKey', {});

            // Generate AES key and encrypt the JSON payload
            const aesKey = generateAESKey();
            const dataJson = JSON.stringify(jsonPayload);
            const encryptedData = encryptAES(dataJson, aesKey);

            // Encrypt the AES key with server's public key
            const encryptedAesKey = encryptRSA(aesKey, serverPublicKey);

            // Create FormData for multipart upload
            const formDataToSend = new FormData();

            // Add encrypted payload
            formDataToSend.append('key', encryptedAesKey);
            formDataToSend.append('keyId', keyId);
            formDataToSend.append('data', encryptedData);

            // Add image if present
            if (formData.picture) {
                formDataToSend.append('image', formData.picture);
            }

            // Send the request
            const response = await axios.post(
                `${API_BASE_URL}/groups/create`,
                formDataToSend,
                {
                    headers: {
                        'Content-Type': 'multipart/form-data'
                    },
                    withCredentials: true
                }
            );

            if (response.data && response.data.status) {
                setSuccessMessage(response.data.message || 'Group created successfully!');
                if (response.data.data?.created) {
                    setCreatedGroupsData(response.data.data.created);
                }
                // Navigate after successful creation
                setTimeout(() => {
                    navigate(redirectUrl);
                }, 3000);
            } else {
                setErrorMessage(response.data?.message || 'Failed to create group');
            }
        } catch (error: any) {
            console.error('Error creating group:', error);
            setErrorMessage(
                error.response?.data?.message ||
                error.message ||
                'An error occurred while creating the group'
            );
        } finally {
            setIsLoading(false);
        }
    };

    const handleCancel = () => {
        navigate(redirectUrl);
    };

    return (
        <div className="min-h-screen flex flex-col" style={{ background: backgroundGradient }}>
            <div style={headerBackground}>
                <Header />
            </div>

            <div className="flex-grow p-6">
                <div className="max-w-4xl mx-auto">
                    <h1 className={`text-3xl font-bold mb-8 ${textColor}`}>Add New Group</h1>

                    {/* Error/Success Messages */}
                    {errorMessage && (
                        <div className={`mb-6 p-4 rounded-lg text-center font-medium ${theme === 'dark' ? 'bg-red-900/30 text-red-300 border border-red-700' : 'bg-red-100 text-red-700 border border-red-300'}`}>
                            {errorMessage}
                        </div>
                    )}
                    {successMessage && (
                        <div className={`mb-6 p-4 rounded-lg font-medium ${theme === 'dark' ? 'bg-green-900/30 text-green-300 border border-green-700' : 'bg-green-100 text-green-700 border border-green-300'}`}>
                            <p className="text-center mb-3">{successMessage}</p>
                            {createdGroupsData && createdGroupsData.length > 0 && (
                                <div className={`mt-2 p-3 rounded text-sm space-y-2 ${theme === 'dark' ? 'bg-green-900/20' : 'bg-green-50'}`}>
                                    {createdGroupsData.map((group) => (
                                        <div key={group.id} className="flex justify-between items-center">
                                            <span><span className="font-semibold capitalize">{group.type}</span>: {group.name}</span>
                                            <span className="opacity-70">{group.membersAdded} member(s) added</span>
                                        </div>
                                    ))}
                                </div>
                            )}
                            <p className="text-center text-xs mt-2 opacity-70">Redirecting...</p>
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-6">
                        {/* Group Name */}
                        <div>
                            <label className={`block text-sm font-medium mb-2 ${textColor}`}>
                                Group Name *
                            </label>
                            <input
                                type="text"
                                name="groupName"
                                value={formData.groupName}
                                onChange={handleInputChange}
                                required
                                className={`w-full px-4 py-3 rounded-lg border ${textColor} focus:ring-2 focus:ring-purple-500 focus:border-transparent`}
                                style={{
                                    backgroundColor: inputBgColor,
                                    borderColor: borderColor
                                }}
                                placeholder="Enter group name"
                            />
                        </div>

                        {/* Description */}
                        <div>
                            <label className={`block text-sm font-medium mb-2 ${textColor}`}>
                                Description
                            </label>
                            <textarea
                                name="description"
                                value={formData.description}
                                onChange={handleInputChange}
                                rows={4}
                                className={`w-full px-4 py-3 rounded-lg border ${textColor} focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none`}
                                style={{
                                    backgroundColor: inputBgColor,
                                    borderColor: borderColor
                                }}
                                placeholder="Enter group description"
                            />
                        </div>

                        {/* Admins */}
                        <div>
                            <label className={`block text-sm font-medium mb-2 ${textColor}`}>
                                Admins *
                            </label>
                            <TokenInput
                                values={formData.admins}
                                onChange={handleAdminsChange}
                                placeholder="Enter admin roll number"
                                label="Admin Roll Number"
                            />
                        </div>

                        {/* Group Type Checkboxes */}
                        <div className="space-y-4">
                            <label className={`block text-sm font-medium mb-3 ${textColor}`}>
                                Group Type
                            </label>
                            <div className="space-y-3">
                                <div className="flex items-center">
                                    <input
                                        type="checkbox"
                                        id="announcementGroupType"
                                        name="isAnnouncementGroup"
                                        checked={formData.isAnnouncementGroup}
                                        onChange={handleCheckboxChange}
                                        className="w-4 h-4 text-purple-600 bg-gray-100 border-gray-300 rounded focus:ring-purple-500 focus:ring-2"
                                    />
                                    <label htmlFor="announcementGroupType" className={`ml-2 text-sm font-medium ${textColor}`}>
                                        Announcement Group
                                    </label>
                                </div>

                                <div className="flex items-center">
                                    <input
                                        type="checkbox"
                                        id="chatGroupType"
                                        name="isChatGroup"
                                        checked={formData.isChatGroup}
                                        onChange={handleCheckboxChange}
                                        className="w-4 h-4 text-purple-600 bg-gray-100 border-gray-300 rounded focus:ring-purple-500 focus:ring-2"
                                    />
                                    <label htmlFor="chatGroupType" className={`ml-2 text-sm font-medium ${textColor}`}>
                                        Chat Group
                                    </label>
                                </div>
                            </div>
                        </div>

                        {/* Picture Upload */}
                        <ImageInput
                            label="Group Picture"
                            value={formData.picture}
                            onChange={(file) => setFormData(prev => ({ ...prev, picture: file }))}
                            placeholder="Select group image"
                            accept="image/*"
                        />                        {/* Members Section */}
                        <div className="space-y-6">
                            {/* CSV Upload Section */}
                            <div>
                                <h3 className={`text-lg font-semibold mb-3 ${textColor}`}>Add Members via CSV</h3>
                                <CsvUploader
                                    columns={['Roll Number']}
                                    setStudents={(uploadedData) => {
                                        if (Array.isArray(uploadedData)) {
                                            const formattedData = uploadedData.map((item: any) => ({
                                                rollNumber: item.rollNumber || '',
                                                name: '',
                                                emailId: ''
                                            }));
                                            setMembers(formattedData);
                                        }
                                    }}
                                    message="Upload a CSV file with column 'Roll Number' (column header must match exactly)"
                                    theme={theme as 'light' | 'dark'}
                                />
                            </div>

                            {/* Manual Entry Section */}
                            <div>
                                <h3 className={`text-lg font-semibold mb-3 ${textColor}`}>Manual Entry</h3>
                                <ManualEntryTable
                                    theme={theme as 'light' | 'dark'}
                                    columns={tableColumns}
                                    students={members}
                                    setStudents={setMembers}
                                    wrongValues={wrongValues}
                                    setWrongValues={setWrongValues}
                                />
                            </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex gap-4 pt-6">
                            <button
                                type="submit"
                                disabled={isLoading}
                                className={`px-8 py-3 bg-green-500 text-white rounded-lg font-medium transition-colors ${isLoading ? 'opacity-50 cursor-not-allowed' : 'hover:bg-green-600'}`}
                            >
                                {isLoading ? 'Creating...' : 'Create Group'}
                            </button>
                            <button
                                type="button"
                                onClick={handleCancel}
                                disabled={isLoading}
                                className={`px-8 py-3 bg-gray-500 text-white rounded-lg font-medium transition-colors ${isLoading ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-600'}`}
                            >
                                Cancel
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default AddGroup;