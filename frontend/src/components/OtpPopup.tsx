import { useState } from 'react';
import { useSelector } from 'react-redux';
import type { RootState } from '../store/store';
import InputComponent from './InputComponent';

interface OtpPopupProps {
    email: string;
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (otp: string) => Promise<void> | void;
    title?: string;
    isLoading?: boolean;
    errorMessage?: string;
    successMessage?: string;
}

const OtpPopup = ({
    email,
    isOpen,
    onClose,
    onSubmit,
    title = "OTP Verification",
    isLoading = false,
    errorMessage = '',
    successMessage = ''
}: OtpPopupProps) => {
    const theme = useSelector((state: RootState) => state.theme.theme);

    const [formData, setFormData] = useState({
        otp: '',
    });
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        
        try {
            await onSubmit(formData.otp);
            // Parent component handles success/error states
        } catch (err) {
            console.error('Error during OTP verification:', err);
            // Parent component handles error display
        } finally {
            setIsSubmitting(false);
        }
    };

    // Define the same gradient classes used in the AdminRegistration page
    const gradientClasses = "bg-[radial-gradient(circle,_rgba(255,255,255,0.3)_0%,_rgba(219,178,255,0.3)_55%,_rgba(219,178,255,0.3)_100%)]";
    const transparentClasses = "bg-transparent";

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 flex items-center justify-center z-50">
            {/* Background overlay with gradient similar to admin page */}
            <div className={`absolute inset-0 ${theme === 'dark' ? 'bg-black bg-opacity-80' : 'bg-gradient-to-b from-[#FFC362] to-[#9653D0] bg-opacity-95'}`}>
                <div className={`h-full w-full ${theme === 'dark' ? transparentClasses : gradientClasses}`}></div>
            </div>
            
            <div className={`relative w-[90%] max-w-[500px] p-6 rounded-lg shadow-lg ${theme === 'dark' ? 'bg-[#240046]' : 'bg-[#FFDEA8]/45'}`}>
                <div className="flex justify-between items-center mb-4">
                    <h2 className={`text-xl font-bold ${theme === 'dark' ? 'text-[#FF9E00]' : 'text-[#421271]'}`}>
                        {title}
                    </h2>
                    <button
                        onClick={onClose}
                        className={`text-2xl focus:outline-none ${theme === 'dark' ? 'text-gray-300 hover:text-white' : 'text-gray-700 hover:text-black'}`}
                    >
                        &times;
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="flex flex-col gap-4 w-[100%]">
                    <div className={`text-center mb-4 ${theme === 'dark' ? 'text-white' : 'text-[#421271]'} text-lg`}>
                        Enter OTP sent to {email}
                    </div>

                    <div className="flex justify-center">
                        <div className="w-3/4">
                            <InputComponent
                                width={100}
                                state={formData}
                                setState={setFormData}
                                keyName="otp"
                                label="OTP"
                                type="text"
                            />
                        </div>
                    </div>

                    {(errorMessage || successMessage) && (
                        <div className={`mt-2 text-sm text-center p-3 rounded-lg ${
                            errorMessage 
                                ? (theme === 'dark' ? 'bg-red-900/30 text-red-300 border border-red-700' : 'bg-red-100 text-red-700 border border-red-300')
                                : (theme === 'dark' ? 'bg-green-900/30 text-green-300 border border-green-700' : 'bg-green-100 text-green-700 border border-green-300')
                        }`}>
                            {errorMessage || successMessage}
                        </div>
                    )}

                    <div className="flex justify-center items-center mt-6">
                        <button
                            type="submit"
                            disabled={isSubmitting || isLoading}
                            className={`px-8 py-3 text-white font-semibold rounded-full transition-colors duration-300 focus:ring-2 focus:ring-offset-2 ${
                                (isSubmitting || isLoading)
                                    ? 'bg-gray-500 cursor-not-allowed'
                                    : theme === 'dark'
                                        ? 'bg-[#FF7900] hover:bg-[#E86C00] focus:ring-[#FF7900]'
                                        : 'bg-[#5A189A] hover:bg-[#4C1184] focus:ring-[#5A189A]'
                                }`}
                        >
                            {(isSubmitting || isLoading) ? (
                                <div className="flex items-center gap-2">
                                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                    {isLoading ? 'Processing...' : 'Verifying...'}
                                </div>
                            ) : (
                                'Verify OTP'
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default OtpPopup;
