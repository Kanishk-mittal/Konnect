import React, { useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useNavigate, Link } from 'react-router-dom';
import type { RootState, AppDispatch } from '../store/store';

// Components
import Header from '../components/Header';
import InputComponent from '../components/InputComponent';
import RecoveryKeyPopup from '../components/RecoveryKeyPopup';

// Redux actions
import { showLoading, hideLoading } from '../store/loadingSlice';

// API and utilities
import { getData, postData, postEncryptedData } from '../api/requests';

const ForgotPassword = () => {
    const theme = useSelector((state: RootState) => state.theme.theme);
    const dispatch: AppDispatch = useDispatch();
    const navigate = useNavigate();

    const gradientClasses = "bg-[radial-gradient(circle,_rgba(255,255,255,0.3)_0%,_rgba(219,178,255,0.3)_55%,_rgba(219,178,255,0.3)_100%)]";
    const transparentClasses = "bg-transparent";

    const [step, setStep] = useState(1); // 1: Request OTP, 2: Reset Password
    const [formData, setFormData] = useState({
        collegeCode: '',
        id: '',
        otp: '',
        recoveryKey: '',
        newPassword: '',
        confirmPassword: ''
    });

    const [errorMessage, setErrorMessage] = useState('');
    const [successMessage, setSuccessMessage] = useState('');
    const [newRecoveryKey, setNewRecoveryKey] = useState('');
    const [showRecoveryPopup, setShowRecoveryPopup] = useState(false);

    const handleRequestOTP = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.collegeCode || !formData.id) {
            setErrorMessage('College Code and ID are required');
            return;
        }

        dispatch(showLoading());
        setErrorMessage('');
        setSuccessMessage('');

        try {
            const response = await postData('/encryption/otp', { id: formData.id, collegeCode: formData.collegeCode });

            if (response.status) {
                setSuccessMessage(response.message || 'OTP sent to your registered email.');
                setStep(2);
            } else {
                setErrorMessage(response.message || 'Failed to send OTP.');
            }
        } catch (error: any) {
            setErrorMessage(error.response?.data?.message || 'Error requesting OTP');
        } finally {
            dispatch(hideLoading());
        }
    };

    const handleResetPassword = async (e: React.FormEvent) => {
        e.preventDefault();
        if (formData.newPassword !== formData.confirmPassword) {
            setErrorMessage('Passwords do not match');
            return;
        }

        dispatch(showLoading());
        setErrorMessage('');

        try {
            const response = await postEncryptedData('/encryption/recover-password', {
                collegeCode: formData.collegeCode,
                id: formData.id,
                otp: formData.otp,
                recoveryKey: formData.recoveryKey,
                newPassword: formData.newPassword
            }, { expectEncryptedResponse: true });

            if (response.status) {
                setNewRecoveryKey(response.data.recoveryKey);
                setShowRecoveryPopup(true);
                setSuccessMessage('Password reset successfully!');
            } else {
                setErrorMessage(response.message || 'Failed to reset password.');
            }
        } catch (error: any) {
            setErrorMessage(error.response?.data?.message || 'Error resetting password');
        } finally {
            dispatch(hideLoading());
        }
    };

    const globalIsLoading = useSelector((state: RootState) => state.loading.isLoading);

    return (
        <div className={`min-h-[100vh] w-[100vw] ${theme === 'dark' ? 'bg-[#0E001B]' : 'bg-gradient-to-b from-[#FFC362] to-[#9653D0]'}`}>
            <div className={`min-h-[100vh] w-[100%] ${theme === 'dark' ? transparentClasses : gradientClasses}`}>
                <Header />
                <div className="flex justify-center p-4">
                    <div className={`flex flex-col gap-6 w-full max-w-md ${theme === 'dark' ? "bg-[#240046]" : "bg-[#FFDEA8]/45"} rounded-lg p-8`}>

                        {(errorMessage || successMessage) && (
                            <div className={`p-4 rounded-lg text-center font-medium ${errorMessage
                                ? (theme === 'dark' ? 'bg-red-900/30 text-red-300 border border-red-700' : 'bg-red-100 text-red-700 border border-red-300')
                                : (theme === 'dark' ? 'bg-green-900/30 text-green-300 border border-green-700' : 'bg-green-100 text-green-700 border border-green-300')
                                }`}>
                                {errorMessage || successMessage}
                            </div>
                        )}

                        <div className={`heading ${theme === "dark" ? "text-[#FF9E00]" : "text-[#421271]"} text-2xl text-center font-bold mb-4`}>
                            Recover Account
                        </div>

                        {step === 1 ? (
                            <form onSubmit={handleRequestOTP} className="flex flex-col gap-4">
                                <p className={`text-sm ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                                    Enter your details to receive an OTP on your registered email.
                                </p>
                                <InputComponent
                                    width={100}
                                    state={formData}
                                    setState={setFormData}
                                    keyName="collegeCode"
                                    label="College Code"
                                    type="text"
                                />
                                <InputComponent
                                    width={100}
                                    state={formData}
                                    setState={setFormData}
                                    keyName="id"
                                    label="ID (Roll Number or Email)"
                                    type="text"
                                />
                                <button
                                    type="submit"
                                    disabled={globalIsLoading}
                                    className={`mt-4 px-6 py-3 text-white font-semibold rounded-full transition-all ${theme === 'dark' ? 'bg-[#FF7900] hover:bg-[#E86C00]' : 'bg-[#5A189A] hover:bg-[#4C1184]'} disabled:opacity-50`}
                                >
                                    {globalIsLoading ? 'Processing...' : 'Get OTP'}
                                </button>
                                <div className="text-center mt-2">
                                    <Link to="/" className={`text-sm hover:underline ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                                        Back to Login
                                    </Link>
                                </div>
                            </form>
                        ) : (
                            <form onSubmit={handleResetPassword} className="flex flex-col gap-4">
                                <p className={`text-sm ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                                    Enter the OTP sent to your email and your recovery key.
                                </p>
                                <InputComponent
                                    width={100}
                                    state={formData}
                                    setState={setFormData}
                                    keyName="otp"
                                    label="OTP (from email)"
                                    type="text"
                                />
                                <InputComponent
                                    width={100}
                                    state={formData}
                                    setState={setFormData}
                                    keyName="recoveryKey"
                                    label="Recovery Key"
                                    type="text"
                                />
                                <InputComponent
                                    width={100}
                                    state={formData}
                                    setState={setFormData}
                                    keyName="newPassword"
                                    label="New Password"
                                    type="password"
                                />
                                <InputComponent
                                    width={100}
                                    state={formData}
                                    setState={setFormData}
                                    keyName="confirmPassword"
                                    label="Confirm New Password"
                                    type="password"
                                />
                                <button
                                    type="submit"
                                    disabled={globalIsLoading}
                                    className={`mt-4 px-6 py-3 text-white font-semibold rounded-full transition-all ${theme === 'dark' ? 'bg-[#FF7900] hover:bg-[#E86C00]' : 'bg-[#5A189A] hover:bg-[#4C1184]'} disabled:opacity-50`}
                                >
                                    {globalIsLoading ? 'Resetting...' : 'Reset Password'}
                                </button>
                                <div className="text-center mt-2">
                                    <button
                                        type="button"
                                        onClick={() => setStep(1)}
                                        className={`text-sm hover:underline ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}
                                    >
                                        Back to Step 1
                                    </button>
                                </div>
                            </form>
                        )}
                    </div>
                </div>
            </div>

            <RecoveryKeyPopup
                isOpen={showRecoveryPopup}
                recoveryKey={newRecoveryKey}
                onClose={() => {
                    setShowRecoveryPopup(false);
                    navigate('/');
                }}
            />
        </div>
    );
};

export default ForgotPassword;
