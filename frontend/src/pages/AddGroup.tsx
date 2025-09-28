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

interface GroupFormData {
    groupName: string;
    description: string;
    admins: string[];
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

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        const validMembers = members.filter(member => member.rollNumber.trim() !== '');
        const groupData = {
            ...formData,
            members: validMembers
        };

        console.log('='.repeat(50));
        console.log('📋 GROUP FORM SUBMISSION');
        console.log('='.repeat(50));

        console.log('🏷️  Basic Information:');
        console.log('   Group Name:', formData.groupName || '(Not provided)');
        console.log('   Description:', formData.description || '(Not provided)');
        console.log('   Admins Count:', formData.admins.length);
        if (formData.admins.length > 0) {
            console.log('   Admin Roll Numbers:', formData.admins.join(', '));
        } else {
            console.log('   Admin Roll Numbers: (None provided)');
        }

        console.log('\n🎯 Group Type Settings:');
        console.log('   Announcement Group:', formData.isAnnouncementGroup ? '✅ Enabled' : '❌ Disabled');
        console.log('   Chat Group:', formData.isChatGroup ? '✅ Enabled' : '❌ Disabled');

        console.log('\n🖼️  Picture Information:');
        if (formData.picture) {
            console.log('   File Name:', formData.picture.name);
            console.log('   File Size:', Math.round(formData.picture.size / 1024) + ' KB');
            console.log('   File Type:', formData.picture.type);
            console.log('   Last Modified:', new Date(formData.picture.lastModified).toLocaleString());
        } else {
            console.log('   No picture selected');
        }

        console.log('\n👥 Members Information:');
        console.log('   Total Members Added:', validMembers.length);
        if (validMembers.length > 0) {
            console.log('   Member Roll Numbers:');
            validMembers.forEach((member, index) => {
                console.log(`     ${index + 1}. ${member.rollNumber}`);
            });
        } else {
            console.log('   No members added');
        }

        console.log('\n📊 Summary:');
        console.log('   Form Validation Status:', formData.groupName && formData.admins.length > 0 ? '✅ Required fields filled' : '❌ Missing required fields');
        console.log('   Ready for Backend:', formData.groupName && formData.admins.length > 0 ? 'Yes' : 'No - Missing required data');

        console.log('\n🔧 Complete Form Data Object:');
        console.log(groupData);

        console.log('='.repeat(50));
        console.log('📤 END OF FORM SUBMISSION');
        console.log('='.repeat(50));

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