import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import axios from 'axios';
import type { RootState } from '../store/store';
import Header from '../components/Header';
import CsvUploader from '../components/CsvUploader';
import ManualEntryTable from '../components/ManualEntryTable';
import TokenInput from '../components/TokenInput';
import type { Student, WrongValue } from './AddStudent';
import { getData } from '../api/requests';

import editIcon from '../assets/edit.png';
import profileIcon from '../assets/profile_icon.png';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api';

interface EditGroupProps {
    redirectUrl?: string;
}

const EditGroupPage: React.FC<EditGroupProps> = ({ redirectUrl }) => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const theme = useSelector((state: RootState) => state.theme.theme);

    const chatGroupId = searchParams.get('chatGroupId');
    const announcementGroupId = searchParams.get('announcementGroupId');
    const activeGroupId = chatGroupId || announcementGroupId;
    const isChatType = !!chatGroupId;

    const [groupName, setGroupName] = useState('');
    const [description, setDescription] = useState('');
    const [admins, setAdmins] = useState<string[]>([]);
    const [members, setMembers] = useState<Student[]>([{
        rollNumber: '',
        name: '',
        emailId: ''
    }]);
    const [groupIconPreview, setGroupIconPreview] = useState<string | null>(null);
    const [groupIconFile, setGroupIconFile] = useState<File | null>(null);
    
    const [wrongValues, setWrongValues] = useState<WrongValue[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isFetching, setIsFetching] = useState(true);
    const [errorMessage, setErrorMessage] = useState('');
    const [successMessage, setSuccessMessage] = useState('');

    const fileInputRef = useRef<HTMLInputElement>(null);

    // Theme-specific colors
    const backgroundGradient = theme === 'dark'
        ? 'linear-gradient(180deg, #000000 0%, #0E001B 8%)'
        : 'linear-gradient(180deg, #9435E5 0%, #FFD795 8%)';

    const textColor = theme === 'dark' ? 'text-white' : 'text-black';
    const inputBgColor = theme === 'dark' ? '#1f2937' : '#ffffff';
    const borderColor = theme === 'dark' ? '#374151' : '#d1d5db';
    const iconFilter = theme === 'dark' ? 'invert(1)' : 'none';

    useEffect(() => {
        if (activeGroupId) {
            fetchGroupInfo();
        } else {
            setIsFetching(false);
            setErrorMessage('No group ID provided.');
        }
    }, [activeGroupId]);

    const fetchGroupInfo = async () => {
        try {
            const endpoint = isChatType 
                ? `/groups/chat/info/${chatGroupId}` 
                : `/groups/announcement/info/${announcementGroupId}`;
            
            const response = await getData(endpoint);
            if (response.status) {
                const { name, description, icon, members: groupMembers } = response.data;
                setGroupName(name);
                setDescription(description || '');
                setGroupIconPreview(icon || null);
                
                // Map members and separate admins
                const adminList: string[] = [];
                const memberList: Student[] = [];
                
                groupMembers.forEach((m: any) => {
                    if (m.isAdmin) {
                        adminList.push(m.id);
                    }
                    memberList.push({
                        rollNumber: m.id,
                        name: m.username || '',
                        emailId: '' // Email not usually returned in group info for privacy
                    });
                });
                
                setAdmins(adminList);
                setMembers(memberList.length > 0 ? memberList : [{ rollNumber: '', name: '', emailId: '' }]);
            } else {
                setErrorMessage(response.message || 'Failed to fetch group information.');
            }
        } catch (error: any) {
            console.error('Error fetching group info:', error);
            setErrorMessage(error.response?.data?.message || 'Error fetching group info.');
        } finally {
            setIsFetching(false);
        }
    };

    const handleIconEdit = () => {
        fileInputRef.current?.click();
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (!file.type.startsWith('image/')) {
            setErrorMessage('Please select an image file');
            return;
        }
        
        setGroupIconFile(file);
        setGroupIconPreview(URL.createObjectURL(file));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!activeGroupId) return;

        setIsLoading(true);
        setErrorMessage('');
        setSuccessMessage('');

        try {
            const validMembers = members.filter(member => member.rollNumber.trim() !== '');
            
            const groupData = {
                groupName,
                description,
                admins,
                members: validMembers.map(m => ({ rollNumber: m.rollNumber }))
            };

            const formDataToSend = new FormData();
            formDataToSend.append('groupData', JSON.stringify(groupData));
            
            if (groupIconFile) {
                formDataToSend.append('image', groupIconFile);
            }

            const endpoint = isChatType 
                ? `${API_BASE_URL}/groups/chat/update/${chatGroupId}`
                : `${API_BASE_URL}/groups/announcement/update/${announcementGroupId}`;

            const response = await axios.put(
                endpoint,
                formDataToSend,
                {
                    headers: { 'Content-Type': 'multipart/form-data' },
                    withCredentials: true
                }
            );

            if (response.data && response.data.status) {
                setSuccessMessage(response.data.message || 'Group updated successfully!');
                setTimeout(() => {
                    if (redirectUrl) {
                        navigate(redirectUrl);
                    } else {
                        navigate(-1);
                    }
                }, 2000);
            } else {
                setErrorMessage(response.data?.message || 'Failed to update group');
            }
        } catch (error: any) {
            console.error('Error updating group:', error);
            setErrorMessage(error.response?.data?.message || 'An error occurred while updating the group');
        } finally {
            setIsLoading(false);
        }
    };

    const tableColumns = [
        { key: 'rollNumber' as keyof Student, label: 'Roll Number', type: 'text' as const }
    ];

    if (isFetching) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center" style={{ background: backgroundGradient }}>
                <div className="text-white text-xl animate-pulse">Loading group details...</div>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex flex-col" style={{ background: backgroundGradient }}>
            <Header />

            <div className="flex-grow p-6">
                <div className="max-w-4xl mx-auto">
                    <h1 className={`text-3xl font-bold mb-8 ${textColor}`}>Edit Group</h1>

                    {errorMessage && (
                        <div className={`mb-6 p-4 rounded-lg text-center font-medium ${theme === 'dark' ? 'bg-red-900/30 text-red-300 border border-red-700' : 'bg-red-100 text-red-700 border border-red-300'}`}>
                            {errorMessage}
                        </div>
                    )}
                    {successMessage && (
                        <div className={`mb-6 p-4 rounded-lg text-center font-medium ${theme === 'dark' ? 'bg-green-900/30 text-green-300 border border-green-700' : 'bg-green-100 text-green-700 border border-green-300'}`}>
                            {successMessage}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-6">
                        {/* ── Group Picture (Circular style like EditProfileModal) ── */}
                        <div className="flex flex-col items-center mb-8">
                            <div className="relative group">
                                <img
                                    src={groupIconPreview || profileIcon}
                                    alt="Group Icon"
                                    className="w-32 h-32 rounded-full object-cover border-4 transition-all"
                                    style={{ borderColor: borderColor }}
                                />
                                <button
                                    type="button"
                                    onClick={handleIconEdit}
                                    className="absolute bottom-0 right-0 p-2 rounded-full shadow-lg hover:opacity-80 transition-opacity bg-purple-600 border-2 border-white"
                                >
                                    <img src={editIcon} alt="Edit" className="w-5 h-5 invert" />
                                </button>
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept="image/*"
                                    onChange={handleFileChange}
                                    className="hidden"
                                />
                            </div>
                            <p className={`mt-2 text-sm font-medium ${textColor} opacity-75`}>Change Group Icon</p>
                        </div>

                        {/* Group Name */}
                        <div>
                            <label className={`block text-sm font-medium mb-2 ${textColor}`}>
                                Group Name *
                            </label>
                            <input
                                type="text"
                                value={groupName}
                                onChange={(e) => setGroupName(e.target.value)}
                                required
                                className={`w-full px-4 py-3 rounded-lg border ${textColor} focus:ring-2 focus:ring-purple-500 focus:border-transparent`}
                                style={{ backgroundColor: inputBgColor, borderColor: borderColor }}
                                placeholder="Enter group name"
                            />
                        </div>

                        {/* Description */}
                        <div>
                            <label className={`block text-sm font-medium mb-2 ${textColor}`}>
                                Description
                            </label>
                            <textarea
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                rows={4}
                                className={`w-full px-4 py-3 rounded-lg border ${textColor} focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none`}
                                style={{ backgroundColor: inputBgColor, borderColor: borderColor }}
                                placeholder="Enter group description"
                            />
                        </div>

                        {/* Admins */}
                        <div>
                            <label className={`block text-sm font-medium mb-2 ${textColor}`}>
                                Admins *
                            </label>
                            <TokenInput
                                values={admins}
                                onChange={setAdmins}
                                placeholder="Enter admin roll number"
                                label="Admin Roll Number"
                            />
                        </div>

                        {/* Members Section */}
                        <div className="space-y-6 pt-4 border-t" style={{ borderColor }}>
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
                                            setMembers(prev => [...prev.filter(m => m.rollNumber), ...formattedData]);
                                        }
                                    }}
                                    message="Upload a CSV file with column 'Roll Number'"
                                    theme={theme as 'light' | 'dark'}
                                />
                            </div>

                            <div>
                                <h3 className={`text-lg font-semibold mb-3 ${textColor}`}>Group Members</h3>
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
                        <div className="flex gap-4 pt-8">
                            <button
                                type="submit"
                                disabled={isLoading}
                                className={`flex-1 py-3 bg-green-500 text-white rounded-lg font-bold text-lg shadow-lg transition-all ${isLoading ? 'opacity-50 cursor-not-allowed' : 'hover:bg-green-600 hover:scale-[1.02]'}`}
                            >
                                {isLoading ? 'Updating...' : 'Update Group'}
                            </button>
                            <button
                                type="button"
                                onClick={() => navigate(-1)}
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

export default EditGroupPage;
