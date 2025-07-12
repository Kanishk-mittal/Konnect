// React and Redux imports
import { useSelector, useDispatch } from 'react-redux';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { RootState } from '../store/store';

// Components
import Header from '../components/Header';
import InputComponent from '../components/InputComponent';
import OtpPopup from '../components/OtpPopup';
import RecoveryKeyPopup from '../components/RecoveryKeyPopup';

// Redux actions
import { setAuthenticated, setEmail, setPrivateKey, setUserId, setUserType } from '../store/authSlice';

// API and utilities
import { postData, getData } from "../api/requests";
import { validateRegistrationData, decryptServerResponse } from '../utils/registrationUtils';

// Encryption utilities
import { encryptAES, generateAESKey } from '../encryption/AES_utils';
import { encryptRSA, generateRSAKeyPair } from '../encryption/RSA_utils';

const AdminRegistration = () => {
  const theme = useSelector((state: RootState) => state.theme.theme);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const gradientClasses = "bg-[radial-gradient(circle,_rgba(255,255,255,0.3)_0%,_rgba(219,178,255,0.3)_55%,_rgba(219,178,255,0.3)_100%)]"
  const transparentClasses = "bg-transparent"

  const [showOtpPopup, setShowOtpPopup] = useState(false);
  const [showRecoveryPopup, setShowRecoveryPopup] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
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
    setIsLoading(true);
    setErrorMessage('');
    setSuccessMessage('');

    try {
      // Prepare form data for registration by removing confirmPassword
      const { confirmPassword, ...registrationData } = formData;

      // Get public key from backend
      const publicKeyResponse = await getData('/encryption/rsa/publicKey', {});
      
      if (!publicKeyResponse || !publicKeyResponse.status) {
        throw new Error('Failed to get encryption key from server');
      }

      const publicKey = publicKeyResponse.publicKey;
      const keyId = publicKeyResponse.keyId;

      // Generate client-side RSA key pair
      const [clientPrivateKey, clientPublicKey] = generateRSAKeyPair();

      // Generate AES key and encrypt data
      const aesKey = generateAESKey();
      const encryptedData = {
        collegeName: encryptAES(registrationData.collegeName, aesKey),
        adminUsername: encryptAES(registrationData.adminUsername, aesKey),
        collegeCode: encryptAES(registrationData.collegeCode, aesKey),
        emailId: encryptAES(registrationData.emailId, aesKey),
        password: encryptAES(registrationData.password, aesKey),
        otp: encryptAES(otp, aesKey),
        key: encryptRSA(aesKey, publicKey),
        keyId: keyId,
        publicKey: clientPublicKey, // Send client's public key for response encryption
      };

      // Send registration data to backend
      const response = await postData('/admin/register', encryptedData);

      // Handle response
      if (response && response.status === true) {
        setSuccessMessage(response.message || 'Registration successful!');
        
        if (response.data && response.key) {
          // Decrypt the response data
          try {
            const decryptedData = decryptServerResponse(
              response.data,
              response.key,
              clientPrivateKey
            );
            
            // Store privateKey in Redux
            dispatch(setPrivateKey(decryptedData.privateKey));
            dispatch(setUserId(decryptedData.id));
            dispatch(setUserType('admin'));
            
            // Set recovery key for popup
            setRecoveryKey(decryptedData.recoveryKey || '');
            
            dispatch(setAuthenticated(true));
            
            // Close OTP popup
            setShowOtpPopup(false);
            
            // Show recovery key popup
            setShowRecoveryPopup(true);
          } catch (error) {
            console.error('Failed to decrypt response:', error);
            setErrorMessage('Failed to process secure data. Please try again.');
            return;
          }
        } else {
          // No encrypted data in response, just proceed
          dispatch(setAuthenticated(true));
          
          // Close popup and navigate after a brief delay to show success message
          setTimeout(() => {
            setShowOtpPopup(false);
            navigate('/admin/dashboard');
          }, 1500);
        }
      } else {
        // Handle backend error responses
        const errorMsg = response?.message || 'Registration failed. Please try again.';
        setErrorMessage(errorMsg);
      }
    } catch (error: any) {
      console.error('Error during registration:', error);
      
      // Handle different types of errors
      let errorMsg = 'An unexpected error occurred during registration.';
      
      if (error?.response?.data?.message) {
        // API error with specific message
        errorMsg = error.response.data.message;
      } else if (error?.message) {
        // General error with message
        errorMsg = error.message;
      }
      
      setErrorMessage(errorMsg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    setIsLoading(true);
    setErrorMessage('');
    setSuccessMessage('');
    
    try {
      // Store email in Redux
      dispatch(setEmail(formData.emailId));
      
      // Validate the form data
      const validation = validateRegistrationData(formData);
      if (!validation.status) {
        setErrorMessage(validation.message);
        return;
      }
      
      // Request backend to send OTP
      const response = await postData('/otp', { emailId: formData.emailId });
      
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
      
      let errorMsg = 'An error occurred while sending OTP.';
      if (error?.response?.data?.message) {
        errorMsg = error.response.data.message;
      } else if (error?.message) {
        errorMsg = error.message;
      }
      
      setErrorMessage(errorMsg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <div className={`min-h-[100vh] w-[100vw] ${theme === 'dark' ? 'bg-[#0E001B]' : 'bg-gradient-to-b from-[#FFC362] to-[#9653D0]'}`}>
        <div className={` h-[100%] w-[100%] ${theme === 'dark' ? transparentClasses : gradientClasses}`}>
          <Header />
          <div className="flex justify-center">          <div className={`flex flex-col gap-6 w-[80%] min-h-[200px] ${theme === 'dark' ? "bg-[#240046]" : "bg-[#FFDEA8]/45"}  rounded-lg p-8`}>
            {/* Message Display */}
            {(errorMessage || successMessage) && (
              <div className={`p-4 rounded-lg text-center font-medium ${
                errorMessage 
                  ? (theme === 'dark' ? 'bg-red-900/30 text-red-300 border border-red-700' : 'bg-red-100 text-red-700 border border-red-300')
                  : (theme === 'dark' ? 'bg-green-900/30 text-green-300 border border-green-700' : 'bg-green-100 text-green-700 border border-green-300')
              }`}>
                {errorMessage || successMessage}
              </div>
            )}
            
            <div className={`heading ${theme==="dark" ? "text-[#FF9E00]" : "text-[#421271]"} text-2xl text-center font-bold mb-4`}>
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
                    disabled={isLoading}
                    className={`mt-4 px-6 py-3 text-white font-semibold rounded-full transition-colors duration-300 focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed ${
                      theme === 'dark' 
                        ? 'bg-[#FF7900] hover:bg-[#E86C00] focus:ring-[#FF7900] disabled:hover:bg-[#FF7900]' 
                        : 'bg-[#5A189A] hover:bg-[#4C1184] focus:ring-[#5A189A] disabled:hover:bg-[#5A189A]'
                    }`}
                  >
                    {isLoading ? (
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        Sending OTP...
                      </div>
                    ) : (
                      'Get OTP'
                    )}
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
        isLoading={isLoading}
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
