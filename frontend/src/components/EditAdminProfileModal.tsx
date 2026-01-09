import React, { useState, useEffect, useRef } from 'react';
import { useSelector } from 'react-redux';
import type { RootState } from '../store/store';
import editIcon from '../assets/edit.png';
import profileIcon from '../assets/profile_icon.png';
import { getData, postData, postEncryptedData } from '../api/requests';

interface EditAdminProfileModalProps {
    isOpen: boolean;
    onClose: () => void;
    userId: string;
}

const EditAdminProfileModal: React.FC<EditAdminProfileModalProps> = ({ isOpen, onClose, userId }) => {
    const theme = useSelector((state: RootState) => state.theme.theme);
    const [profilePicture, setProfilePicture] = useState<string | null>(null);
    const [username, setUsername] = useState('');
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [otp, setOtp] = useState('');
    const [showOtpField, setShowOtpField] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (isOpen) {
            fetchProfileData();
        }
    }, [isOpen, userId]);

    const fetchProfileData = async () => {
        try {
            // Get admin details from JWT token (authenticated endpoint)
            const response = await getData('/admin/details');
            if (response.status) {
                setUsername(response.data.username || '');
                // Get profile picture from separate endpoint
                const picResponse = await getData(`/admin/profile/picture/${userId}`);
                if (picResponse.status) {
                    setProfilePicture(picResponse.profilePicture || null);
                }
            }
        } catch (err) {
            console.error('Error fetching profile:', err);
        }
    };

    const handleProfilePictureEdit = () => {
        fileInputRef.current?.click();
    };

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Validate file type
        if (!file.type.startsWith('image/')) {
            setError('Please select an image file');
            return;
        }

        // Validate file size (max 5MB)
        if (file.size > 5 * 1024 * 1024) {
            setError('File size must be less than 5MB');
            return;
        }

        setIsLoading(true);
        setError('');

        try {
            const formData = new FormData();
            formData.append('image', file);

            // Use postData (unencrypted) for file upload
            const response = await postData('/admin/profile/picture', formData);
            if (response.status) {
                setProfilePicture(response.data.profilePicture);
                setSuccess('Profile picture updated successfully!');
                setTimeout(() => setSuccess(''), 3000);
            }
        } catch (err: any) {
            setError(err.response?.data?.message || 'Failed to update profile picture');
        } finally {
            setIsLoading(false);
        }
    };

    const handleUsernameUpdate = async () => {
        if (!username.trim()) {
            setError('Username cannot be empty');
            return;
        }

        setIsLoading(true);
        setError('');

        try {
            const response = await postEncryptedData('/admin/profile/username', {
                userId,
                username: username.trim()
            });

            if (response.status) {
                setSuccess('Username updated successfully!');
                setTimeout(() => setSuccess(''), 3000);
            }
        } catch (err: any) {
            setError(err.response?.data?.message || 'Failed to update username');
        } finally {
            setIsLoading(false);
        }
    };

    const handlePasswordChange = async () => {
        if (!currentPassword || !newPassword || !confirmPassword) {
            setError('All password fields are required');
            return;
        }

        if (newPassword !== confirmPassword) {
            setError('New passwords do not match');
            return;
        }

        if (newPassword.length < 8) {
            setError('Password must be at least 8 characters long');
            return;
        }

        setIsLoading(true);
        setError('');

        try {
            // Request OTP for password change
            const response = await postEncryptedData('/admin/profile/password/request-otp', {
                userId,
                currentPassword
            });

            if (response.status) {
                setShowOtpField(true);
                setSuccess('OTP sent to your email. Please check your inbox.');
            }
        } catch (err: any) {
            setError(err.response?.data?.message || 'Failed to send OTP');
        } finally {
            setIsLoading(false);
        }
    };

    const handlePasswordChangeWithOtp = async () => {
        if (!otp.trim()) {
            setError('Please enter the OTP');
            return;
        }

        setIsLoading(true);
        setError('');

        try {
            const response = await postEncryptedData('/admin/profile/password/change', {
                userId,
                currentPassword,
                newPassword,
                otp: otp.trim()
            });

            if (response.status) {
                setSuccess('Password changed successfully!');
                setCurrentPassword('');
                setNewPassword('');
                setConfirmPassword('');
                setOtp('');
                setShowOtpField(false);
                setTimeout(() => setSuccess(''), 3000);
            }
        } catch (err: any) {
            setError(err.response?.data?.message || 'Failed to change password');
        } finally {
            setIsLoading(false);
        }
    };

    if (!isOpen) return null;

    const backgroundColor = theme === 'dark' ? '#1a1a2e' : '#ffffff';
    const textColor = theme === 'dark' ? '#ffffff' : '#000000';
    const overlayColor = theme === 'dark' ? 'rgba(0, 0, 0, 0.8)' : 'rgba(0, 0, 0, 0.5)';
    const inputBg = theme === 'dark' ? '#2a2a3e' : '#f5f5f5';
    const iconFilter = theme === 'dark' ? 'invert(1)' : 'none';

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center"
            style={{ backgroundColor: overlayColor }}
            onClick={onClose}
        >
            <div
                className="rounded-lg shadow-xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto"
                style={{ backgroundColor, color: textColor }}
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-bold">Edit Profile - Admin</h2>
                    <button
                        onClick={onClose}
                        className="text-2xl hover:opacity-70 transition-opacity"
                    >
                        ×
                    </button>
                </div>

                {/* Messages */}
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

                {/* Profile Picture Section */}
                <div className="mb-6">
                    <h3 className="text-lg font-semibold mb-3">Profile Picture</h3>
                    <div className="flex items-center gap-4">
                        <img
                            src={profilePicture || profileIcon}
                            alt="Profile"
                            className="w-24 h-24 rounded-full object-cover border-2"
                            style={{ borderColor: theme === 'dark' ? '#444' : '#ccc' }}
                        />
                        <button
                            onClick={handleProfilePictureEdit}
                            disabled={isLoading}
                            className="flex items-center gap-2 px-4 py-2 rounded-lg hover:opacity-80 transition-opacity"
                            style={{ backgroundColor: theme === 'dark' ? '#444' : '#ddd' }}
                        >
                            <img src={editIcon} alt="Edit" className="w-5 h-5" style={{ filter: iconFilter }} />
                            <span>Change Picture</span>
                        </button>
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/*"
                            onChange={handleFileChange}
                            className="hidden"
                        />
                    </div>
                </div>

                {/* Username Section */}
                <div className="mb-6">
                    <h3 className="text-lg font-semibold mb-3">Username</h3>
                    <div className="flex gap-3">
                        <input
                            type="text"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            className="flex-1 px-4 py-2 rounded-lg border"
                            style={{
                                backgroundColor: inputBg,
                                borderColor: theme === 'dark' ? '#444' : '#ccc',
                                color: textColor
                            }}
                            placeholder="Enter username"
                            disabled={isLoading}
                        />
                        <button
                            onClick={handleUsernameUpdate}
                            disabled={isLoading}
                            className="px-6 py-2 rounded-lg font-medium text-white hover:opacity-80 transition-opacity"
                            style={{ backgroundColor: isLoading ? '#666' : '#4CAF50' }}
                        >
                            Update
                        </button>
                    </div>
                </div>

                {/* Password Section */}
                <div className="mb-6">
                    <h3 className="text-lg font-semibold mb-3">Change Password</h3>
                    <div className="space-y-3">
                        <input
                            type="password"
                            value={currentPassword}
                            onChange={(e) => setCurrentPassword(e.target.value)}
                            className="w-full px-4 py-2 rounded-lg border"
                            style={{
                                backgroundColor: inputBg,
                                borderColor: theme === 'dark' ? '#444' : '#ccc',
                                color: textColor
                            }}
                            placeholder="Current Password"
                            disabled={isLoading}
                        />
                        <input
                            type="password"
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            className="w-full px-4 py-2 rounded-lg border"
                            style={{
                                backgroundColor: inputBg,
                                borderColor: theme === 'dark' ? '#444' : '#ccc',
                                color: textColor
                            }}
                            placeholder="New Password"
                            disabled={isLoading}
                        />
                        <input
                            type="password"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            className="w-full px-4 py-2 rounded-lg border"
                            style={{
                                backgroundColor: inputBg,
                                borderColor: theme === 'dark' ? '#444' : '#ccc',
                                color: textColor
                            }}
                            placeholder="Confirm New Password"
                            disabled={isLoading}
                        />

                        {showOtpField ? (
                            <>
                                <input
                                    type="text"
                                    value={otp}
                                    onChange={(e) => setOtp(e.target.value)}
                                    className="w-full px-4 py-2 rounded-lg border"
                                    style={{
                                        backgroundColor: inputBg,
                                        borderColor: theme === 'dark' ? '#444' : '#ccc',
                                        color: textColor
                                    }}
                                    placeholder="Enter OTP"
                                    disabled={isLoading}
                                />
                                <button
                                    onClick={handlePasswordChangeWithOtp}
                                    disabled={isLoading}
                                    className="w-full py-2 rounded-lg font-medium text-white hover:opacity-80 transition-opacity"
                                    style={{ backgroundColor: isLoading ? '#666' : '#4CAF50' }}
                                >
                                    {isLoading ? 'Verifying...' : 'Verify OTP & Change Password'}
                                </button>
                            </>
                        ) : (
                            <button
                                onClick={handlePasswordChange}
                                disabled={isLoading}
                                className="w-full py-2 rounded-lg font-medium text-white hover:opacity-80 transition-opacity"
                                style={{ backgroundColor: isLoading ? '#666' : '#FF9800' }}
                            >
                                {isLoading ? 'Sending OTP...' : 'Request OTP to Change Password'}
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default EditAdminProfileModal;
