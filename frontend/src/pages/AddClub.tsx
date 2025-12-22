import React, { useState } from 'react';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import type { RootState } from '../store/store';
import Header from '../components/Header';
import ImageInput from '../components/ImageInput';
import { getData } from '../api/requests';
import axios from 'axios';
import { encryptAES, generateAESKey } from '../encryption/AES_utils';
import { encryptRSA } from '../encryption/RSA_utils';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api';

interface ClubFormData {
    clubName: string;
    email: string;
    password: string;
    confirmPassword: string;
    picture: File | null;
}

const AddClub = () => {
    const navigate = useNavigate();
    const theme = useSelector((state: RootState) => state.theme.theme);

    const [formData, setFormData] = useState<ClubFormData>({
        clubName: '',
        email: '',
        password: '',
        confirmPassword: '',
        picture: null
    });

    const [isLoading, setIsLoading] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');
    const [successMessage, setSuccessMessage] = useState('');
    const [recoveryKey, setRecoveryKey] = useState<string | null>(null);

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

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        setIsLoading(true);
        setErrorMessage('');
        setSuccessMessage('');

        try {
            // Validate passwords match
            if (formData.password !== formData.confirmPassword) {
                setErrorMessage('Passwords do not match');
                setIsLoading(false);
                return;
            }

            // Validate password strength
            if (formData.password.length < 6) {
                setErrorMessage('Password must be at least 6 characters long');
                setIsLoading(false);
                return;
            }

            // Validate email
            if (!formData.email || !formData.email.includes('@')) {
                setErrorMessage('Please enter a valid email address');
                setIsLoading(false);
                return;
            }

            // Prepare the JSON payload
            const jsonPayload = {
                clubName: formData.clubName,
                email: formData.email,
                password: formData.password
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
                `${API_BASE_URL}/club/create`,
                formDataToSend,
                {
                    headers: {
                        'Content-Type': 'multipart/form-data'
                    },
                    withCredentials: true
                }
            );

            if (response.data && response.data.status) {
                setSuccessMessage(response.data.message || 'Club created successfully!');

                // Navigate to dashboard after successful creation
                setTimeout(() => {
                    navigate('/admin/dashboard');
                }, 1500);
            } else {
                setErrorMessage(response.data?.message || 'Failed to create club');
            }
        } catch (error: any) {
            console.error('Error creating club:', error);
            setErrorMessage(
                error.response?.data?.message ||
                error.message ||
                'An error occurred while creating the club'
            );
        } finally {
            setIsLoading(false);
        }
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
                    <h1 className={`text-3xl font-bold mb-8 ${textColor}`}>Add New Club</h1>

                    {/* Error/Success Messages */}
                    {(errorMessage || successMessage) && (
                        <div className={`mb-6 p-4 rounded-lg text-center font-medium ${errorMessage
                            ? (theme === 'dark' ? 'bg-red-900/30 text-red-300 border border-red-700' : 'bg-red-100 text-red-700 border border-red-300')
                            : (theme === 'dark' ? 'bg-green-900/30 text-green-300 border border-green-700' : 'bg-green-100 text-green-700 border border-green-300')
                            }`}>
                            {errorMessage || successMessage}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-6">
                        {/* Club Name */}
                        <div>
                            <label className={`block text-sm font-medium mb-2 ${textColor}`}>
                                Club Name *
                            </label>
                            <input
                                type="text"
                                name="clubName"
                                value={formData.clubName}
                                onChange={handleInputChange}
                                required
                                className={`w-full px-4 py-3 rounded-lg border ${textColor} focus:ring-2 focus:ring-purple-500 focus:border-transparent`}
                                style={{
                                    backgroundColor: inputBgColor,
                                    borderColor: borderColor
                                }}
                                placeholder="Enter club name"
                            />
                        </div>

                        {/* Email */}
                        <div>
                            <label className={`block text-sm font-medium mb-2 ${textColor}`}>
                                Email *
                            </label>
                            <input
                                type="email"
                                name="email"
                                value={formData.email}
                                onChange={handleInputChange}
                                required
                                className={`w-full px-4 py-3 rounded-lg border ${textColor} focus:ring-2 focus:ring-purple-500 focus:border-transparent`}
                                style={{
                                    backgroundColor: inputBgColor,
                                    borderColor: borderColor
                                }}
                                placeholder="Enter club email"
                            />
                        </div>

                        {/* Password */}
                        <div>
                            <label className={`block text-sm font-medium mb-2 ${textColor}`}>
                                Password *
                            </label>
                            <input
                                type="password"
                                name="password"
                                value={formData.password}
                                onChange={handleInputChange}
                                required
                                className={`w-full px-4 py-3 rounded-lg border ${textColor} focus:ring-2 focus:ring-purple-500 focus:border-transparent`}
                                style={{
                                    backgroundColor: inputBgColor,
                                    borderColor: borderColor
                                }}
                                placeholder="Enter password"
                            />
                        </div>

                        {/* Confirm Password */}
                        <div>
                            <label className={`block text-sm font-medium mb-2 ${textColor}`}>
                                Confirm Password *
                            </label>
                            <input
                                type="password"
                                name="confirmPassword"
                                value={formData.confirmPassword}
                                onChange={handleInputChange}
                                required
                                className={`w-full px-4 py-3 rounded-lg border ${textColor} focus:ring-2 focus:ring-purple-500 focus:border-transparent`}
                                style={{
                                    backgroundColor: inputBgColor,
                                    borderColor: borderColor
                                }}
                                placeholder="Confirm password"
                            />
                        </div>

                        {/* Picture Upload */}
                        <ImageInput
                            label="Club Picture (Optional)"
                            value={formData.picture}
                            onChange={(file) => setFormData(prev => ({ ...prev, picture: file }))}
                            placeholder="Select club image"
                            accept="image/*"
                        />

                        {/* Action Buttons */}
                        <div className="flex gap-4 pt-6">
                            <button
                                type="submit"
                                disabled={isLoading}
                                className={`px-8 py-3 bg-green-500 text-white rounded-lg font-medium transition-colors ${isLoading ? 'opacity-50 cursor-not-allowed' : 'hover:bg-green-600'}`}
                            >
                                {isLoading ? 'Creating...' : 'Create Club'}
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

export default AddClub;
