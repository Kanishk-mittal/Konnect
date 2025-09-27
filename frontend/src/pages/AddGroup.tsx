import React, { useState } from 'react';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import type { RootState } from '../store/store';
import Header from '../components/Header';
import CsvUploader from '../components/CsvUploader';
import ManualEntryTable from '../components/ManualEntryTable';
import type { Student, WrongValue } from './AddStudent';

interface GroupFormData {
    groupName: string;
    description: string;
    admins: string;
    picture: File | null;
    members: Student[];
    isAnnouncementGroup: boolean;
    isChatGroup: boolean;
}

const AddGroup = () => {
    const navigate = useNavigate();
    const theme = useSelector((state: RootState) => state.theme.theme);

    const [formData, setFormData] = useState<GroupFormData>({
        groupName: '',
        description: '',
        admins: '',
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

    const handlePictureChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0] || null;
        setFormData(prev => ({
            ...prev,
            picture: file
        }));
    };

    // Table column for members (only roll number needed for groups)
    const tableColumns = [
        { key: 'rollNumber' as keyof Student, label: 'Roll Number', type: 'text' as const }
    ];

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const groupData = {
            ...formData,
            members: members.filter(member => member.rollNumber.trim() !== '')
        };
        console.log('Group data:', groupData);
        // Here you would typically send the data to your backend
        navigate('/admin/dashboard');
    };

    const handleCancel = () => {
        navigate('/admin/dashboard');
    };

    return (
        <div className="min-h-screen flex flex-col" style={{ background: backgroundGradient }}>
            <div style={headerBackground}>
                <Header editProfileUrl="/admin/edit-profile" />
            </div>

            <div className="flex-grow p-6">
                <div className="max-w-4xl mx-auto">
                    <h1 className={`text-3xl font-bold mb-8 ${textColor}`}>Add New Group</h1>

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
                            <input
                                type="text"
                                name="admins"
                                value={formData.admins}
                                onChange={handleInputChange}
                                required
                                className={`w-full px-4 py-3 rounded-lg border ${textColor} focus:ring-2 focus:ring-purple-500 focus:border-transparent`}
                                style={{
                                    backgroundColor: inputBgColor,
                                    borderColor: borderColor
                                }}
                                placeholder="Enter admin roll numbers (comma separated)"
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
                        <div>
                            <label className={`block text-sm font-medium mb-2 ${textColor}`}>
                                Group Picture
                            </label>
                            <div className="flex items-center space-x-4">
                                <input
                                    type="file"
                                    accept="image/*"
                                    onChange={handlePictureChange}
                                    className="hidden"
                                    id="picture-upload"
                                />
                                <label
                                    htmlFor="picture-upload"
                                    className="px-6 py-3 rounded-lg border-2 border-dashed cursor-pointer hover:opacity-80 transition-opacity"
                                    style={{
                                        backgroundColor: inputBgColor,
                                        borderColor: borderColor
                                    }}
                                >
                                    <span className={textColor}>
                                        {formData.picture ? formData.picture.name : 'Choose Image'}
                                    </span>
                                </label>
                                {formData.picture && (
                                    <button
                                        type="button"
                                        onClick={() => setFormData(prev => ({ ...prev, picture: null }))}
                                        className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
                                    >
                                        Remove
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* Members Section */}
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
                                className="px-8 py-3 bg-green-500 text-white rounded-lg font-medium hover:bg-green-600 transition-colors"
                            >
                                Create Group
                            </button>
                            <button
                                type="button"
                                onClick={handleCancel}
                                className="px-8 py-3 bg-gray-500 text-white rounded-lg font-medium hover:bg-gray-600 transition-colors"
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