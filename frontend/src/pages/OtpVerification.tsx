import { useSelector } from 'react-redux';
import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import Header from '../components/Header';
import type { RootState } from '../store/store';
import InputComponent from '../components/InputComponent';

interface OtpVerificationProps {
    nextPage?: string;
}

const OtpVerification = ({ nextPage = "/dashboard" }: OtpVerificationProps) => {
    const theme = useSelector((state: RootState) => state.theme.theme);
    const email = useSelector((state: RootState) => state.auth.email || '*****@gmail.com');
    const navigate = useNavigate();
    const location = useLocation();

    // Get nextPage from location state if provided
    const redirectTo = location.state?.nextPage || nextPage;
    
    const gradientClasses = "bg-[radial-gradient(circle,_rgba(255,255,255,0.3)_0%,_rgba(219,178,255,0.3)_55%,_rgba(219,178,255,0.3)_100%)]";
    const transparentClasses = "bg-transparent";

    const [formData, setFormData] = useState({
        otp: '',
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        console.log('OTP submitted:', formData);
        
        // In a real app, you would verify the OTP with your backend here
        
        // If OTP verification succeeds, navigate to the next page
        console.log(`Navigating to: ${redirectTo}`);
        navigate(redirectTo);
    };

    return (
        <>
            <div className={`min-h-[100vh] w-[100vw] ${theme === 'dark' ? 'bg-[#0E001B]' : 'bg-gradient-to-b from-[#FFC362] to-[#9653D0]'}`}>
                <div className={`h-[100%] w-[100%] ${theme === 'dark' ? transparentClasses : gradientClasses}`}>
                    <Header />
                    <div className="flex justify-center">
                        <div className={`flex flex-col gap-6 w-[80%] min-h-[200px] ${theme === 'dark' ? "bg-[#240046]" : "bg-[#FFDEA8]/45"} rounded-lg p-8`}>
                            <div className={`heading ${theme === "dark" ? "text-[#FF9E00]" : "text-[#421271]"} text-2xl text-center font-bold mb-4`}>
                                OTP Verification
                            </div>

                            <form onSubmit={handleSubmit} className="flex flex-col gap-4 w-[100%] p-8 items-center">
                                <div className="flex flex-col w-[50%] items-center">
                                    <div className={`mb-4 text-center ${theme === 'dark' ? 'text-white' : 'text-[#421271]'}`}>
                                        Enter OTP sent at {email}
                                    </div>
                                    <div className={`mb-4 text-sm text-center ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                                        After verification, you will be redirected to {redirectTo.replace('/', '')}
                                    </div>
                                    <InputComponent
                                        width={100}
                                        state={formData}
                                        setState={setFormData}
                                        keyName="otp"
                                        label="OTP"
                                        type="text"
                                    />
                                </div>

                                <div className='flex justify-center items-center'>
                                    <button
                                        type="submit"
                                        className={`mt-4 px-6 py-3 text-white font-semibold rounded-full transition-colors duration-300 focus:ring-2 focus:ring-offset-2 ${theme === 'dark'
                                                ? 'bg-[#FF7900] hover:bg-[#E86C00] focus:ring-[#FF7900]'
                                                : 'bg-[#5A189A] hover:bg-[#4C1184] focus:ring-[#5A189A]'
                                            }`}
                                    >
                                        Verify OTP
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
};

export default OtpVerification;
