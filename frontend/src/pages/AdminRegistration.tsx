// React and Redux imports
import { useSelector, useDispatch } from 'react-redux';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { RootState, AppDispatch } from '../store/store';

// Components
import Header from '../components/Header';
import InputComponent from '../components/InputComponent';
import OtpPopup from '../components/OtpPopup';
import RecoveryKeyPopup from '../components/RecoveryKeyPopup';

// Redux actions
import { setAuth } from '../store/authSlice';
import { fetchUser } from '../store/userSlice';
import { showLoading, hideLoading } from '../store/loadingSlice'; // Import global loading actions

// API and utilities
import { postData, postEncryptedData } from "../api/requests";
import { validateRegistrationData } from '../utils/registrationUtils';
import { importAndStorePrivateKey } from '../services/cryptoService'; // New import

const AdminRegistration = () => {
  const theme = useSelector((state: RootState) => state.theme.theme);
  const dispatch: AppDispatch = useDispatch(); // Use AppDispatch
  const navigate = useNavigate();
  const gradientClasses = "bg-[radial-gradient(circle,_rgba(255,255,255,0.3)_0%,_rgba(219,178,255,0.3)_55%,_rgba(219,178,255,0.3)_100%)]"
  const transparentClasses = "bg-transparent"

  const [showOtpPopup, setShowOtpPopup] = useState(false);
  const [showRecoveryPopup, setShowRecoveryPopup] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [recoveryKey, setRecoveryKey] = useState('');

  const [formData, setFormData] = useState({
    collegeName: '',
    adminUsername: '',
    collegeCode: '',
    emailId: '',
    password: '',
    confirmPassword: ''
  });

  const register = async (otp: string): Promise<void> => {
    dispatch(showLoading()); // Use global loading
    setErrorMessage('');
    setSuccessMessage('');

    try {
      // Prepare form data for registration by removing confirmPassword
      const { confirmPassword, ...registrationData } = formData;

      // Add OTP to registration data
      const dataToSend = {
        ...registrationData,
        otp: otp,
      };

      // Use postEncryptedData to handle encryption automatically
      const response = await postEncryptedData(
        '/college/register-college',
        dataToSend,
        { expectEncryptedResponse: true }
      );

      // Handle response (now automatically decrypted)
      if (response && response.status === true) {
        setSuccessMessage(response.message || 'Registration successful!');

        // Sensitive data is nested inside response.data by the backend
        const { privateKey, id, recoveryKey: resRecoveryKey, userType } = response.data || {};

        if (privateKey && id && userType) {
          // Securely store the private key in IndexedDB
          await importAndStorePrivateKey(id, privateKey);

          // Set authentication state in Redux
          dispatch(setAuth({ userId: id, userType }));

          // Fetch user profile data
          dispatch(fetchUser());

          // Set recovery key for popup if available
          if (resRecoveryKey) {
            setRecoveryKey(resRecoveryKey);
          }

          // Close OTP popup
          setShowOtpPopup(false);

          // Show recovery key popup
          setShowRecoveryPopup(true);
        } else {
          // If privateKey, id, or userType are missing, something went wrong
          throw new Error('Registration response missing essential data (private key, user ID, or user type).');
        }
      } else {
        // Handle backend error responses
        const errorMsg = response?.message || 'Registration failed. Please try again.';
        setErrorMessage(errorMsg);
      }
    } catch (error: any) {
      console.error('Error during registration:', error);

      // Handle different types of errors
      let errorMsg = error.message || 'An unexpected error occurred during registration.';

      if (error?.response?.data?.message) {
        // API error with specific message
        errorMsg = error.response.data.message;
      }

      setErrorMessage(errorMsg);
    } finally {
      dispatch(hideLoading()); // Use global loading
    }
  };
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    dispatch(showLoading()); // Use global loading
    setErrorMessage('');
    setSuccessMessage('');

    try {
      // Validate the form data
      const validation = validateRegistrationData(formData);
      if (!validation.status) {
        setErrorMessage(validation.message);
        dispatch(hideLoading()); // Hide loading if validation fails
        return;
      }

      // Request backend to send OTP
      const response = await postData('/college/otp', { emailId: formData.emailId });

      if (response && response.status === true) {
        setSuccessMessage(response.message || 'OTP sent successfully!');
        // Show OTP popup for verification
        setTimeout(() => {
          setShowOtpPopup(true);
        }, 1000);
      } else {
        const errorMsg = response?.message || 'Failed to send OTP. Please try again.';
        setErrorMessage(errorMsg);
      }
    } catch (error: any) {
      console.error('Error sending OTP:', error);

      let errorMsg = error.message || 'An error occurred while sending OTP.';
      if (error?.response?.data?.message) {
        errorMsg = error.response.data.message;
      }

      setErrorMessage(errorMsg);
    } finally {
      dispatch(hideLoading()); // Use global loading
    }
  };

  const globalIsLoading = useSelector((state: RootState) => state.loading.isLoading); // Get global loading state

  return (
    <>
      <div className={`min-h-[100vh] w-[100vw] ${theme === 'dark' ? 'bg-[#0E001B]' : 'bg-gradient-to-b from-[#FFC362] to-[#9653D0]'}`}>
        <div className={` h-[100%] w-[100%] ${theme === 'dark' ? transparentClasses : gradientClasses}`}>
          <Header />
          <div className="flex justify-center">          <div className={`flex flex-col gap-6 w-[80%] min-h-[200px] ${theme === 'dark' ? "bg-[#240046]" : "bg-[#FFDEA8]/45"}  rounded-lg p-8`}>
            {/* Message Display */}
            {(errorMessage || successMessage) && (
              <div className={`p-4 rounded-lg text-center font-medium ${errorMessage
                ? (theme === 'dark' ? 'bg-red-900/30 text-red-300 border border-red-700' : 'bg-red-100 text-red-700 border border-red-300')
                : (theme === 'dark' ? 'bg-green-900/30 text-green-300 border border-green-700' : 'bg-green-100 text-green-700 border border-green-300')
                }`}>
                {errorMessage || successMessage}
              </div>
            )}

            <div className={`heading ${theme === "dark" ? "text-[#FF9E00]" : "text-[#421271]"} text-2xl text-center font-bold mb-4`}>
              Welcome to the world of organized communication
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col gap-4 w-[100%] p-8">
              <div className="flex flex-col justify-between md:flex-row gap-28">
                <InputComponent
                  width={100}
                  state={formData}
                  setState={setFormData}
                  keyName="collegeName"
                  label="College Name"
                  type="text"
                />
                <InputComponent
                  width={100}
                  state={formData}
                  setState={setFormData}
                  keyName="adminUsername"
                  label="Admin Username"
                  type="text"
                />
              </div>
              <div className='flex flex-col md:flex-row  justify-between items-center gap-4 w-[60%] '>
                <InputComponent
                  width={100}
                  state={formData}
                  setState={setFormData}
                  keyName="collegeCode"
                  label="College Code"
                  type="text"
                />
                <div className={`font-bold text-[0.9rem] ${theme === 'dark' ? 'text-white' : ''}`}>*short 5 character unique code for your college</div>
                <div className='w-[10%]' ></div>
              </div>
              <InputComponent
                width={60}
                state={formData}
                setState={setFormData}
                keyName="emailId"
                label="Email ID"
                type="email"
              />
              <div className="flex flex-col md:flex-row gap-28">
                <InputComponent
                  width={100}
                  state={formData}
                  setState={setFormData}
                  keyName="password"
                  label="Password"
                  type="password"
                />
                <InputComponent
                  width={100}
                  state={formData}
                  setState={setFormData}
                  keyName="confirmPassword"
                  label="Confirm Password"
                  type="password"
                />
              </div>

              <div className='flex justify-center items-center'>
                <button
                  type="submit"
                  disabled={globalIsLoading} // Use global loading state
                  className={`mt-4 px-6 py-3 text-white font-semibold rounded-full transition-colors duration-300 focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed ${theme === 'dark'
                    ? 'bg-[#FF7900] hover:bg-[#E86C00] focus:ring-[#FF7900] disabled:hover:bg-[#FF7900]'
                    : 'bg-[#5A189A] hover:bg-[#4C1184] focus:ring-[#5A189A] disabled:hover:bg-[#5A189A]'
                    }`}
                >
                  {globalIsLoading ? 'Processing...' : 'Get OTP'}
                </button>
              </div>
            </form>
          </div>
          </div>
        </div>
      </div>

      {/* OTP Verification Popup */}
      <OtpPopup
        isOpen={showOtpPopup}
        onClose={() => {
          setShowOtpPopup(false);
          setErrorMessage('');
          setSuccessMessage('');
        }}
        onSubmit={register}
        email={formData.emailId}
        title="Verify Your Email"
        errorMessage={errorMessage}
        successMessage={successMessage}
      />

      <RecoveryKeyPopup
        isOpen={showRecoveryPopup}
        recoveryKey={recoveryKey}
        onClose={() => {
          setShowRecoveryPopup(false);
          navigate('/admin/dashboard');
        }}
      />
    </>
  );
};

export default AdminRegistration;
