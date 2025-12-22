// React and Redux imports
import { useSelector, useDispatch } from 'react-redux';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { RootState } from '../store/store';

// Components
import Header from '../components/Header';
import InputComponent from '../components/InputComponent';

// Redux actions
import { setAuthenticated, setPrivateKey, setUserId, setUserType, clearAuth } from '../store/authSlice';

// API and utilities
import { postEncryptedData, logout } from '../api/requests';
import { savePrivateKey } from '../utils/privateKeyManager';

const StudentLogin = () => {
  const theme = useSelector((state: RootState) => state.theme.theme);
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const gradientClasses = "bg-[radial-gradient(circle,_rgba(255,255,255,0.3)_0%,_rgba(219,178,255,0.3)_55%,_rgba(219,178,255,0.3)_100%)]";
  const transparentClasses = "bg-transparent";

  const [formData, setFormData] = useState({
    collegeCode: '',
    rollNumber: '',
    password: '',
  });
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMessage('');
    setSuccessMessage('');

    try {
      // First, clear any existing session (logout from any previous admin/club/student session)
      await logout('admin'); // Try to clear admin cookie
      await logout('club');  // Try to clear club cookie
      await logout('student'); // Try to clear student cookie

      // Clear Redux state
      dispatch(clearAuth());

      // Validate required fields
      if (!formData.collegeCode || !formData.rollNumber || !formData.password) {
        setErrorMessage('All fields are required');
        setIsLoading(false);
        return;
      }

      // Use postEncryptedData for simplified encryption handling
      const response = await postEncryptedData(
        '/student/login',
        {
          collegeCode: formData.collegeCode,
          rollNumber: formData.rollNumber,
          password: formData.password
        },
        { expectEncryptedResponse: true }
      );

      if (response && response.status === true) {
        setSuccessMessage(response.message || 'Login successful!');

        // Handle response (now automatically decrypted)
        if (response.privateKey && response.id) {
          // Save to Redux store (primary storage)
          dispatch(setPrivateKey(response.privateKey));
          dispatch(setUserId(response.id));
          dispatch(setUserType('student'));

          // Save to localStorage as backup
          await savePrivateKey(response.privateKey, 'student', response.id);
        }

        dispatch(setAuthenticated(true));

        // Navigate after a brief delay to show success message
        setTimeout(() => {
          navigate('/student/dashboard');
        }, 1000);
      } else {
        const errorMsg = response?.message || 'Login failed. Please try again.';
        setErrorMessage(errorMsg);
      }
    } catch (error: any) {
      console.error('Error during login:', error);

      // Handle different types of errors
      let errorMsg = 'An unexpected error occurred during login.';

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

  return (
    <div className={`min-h-[100vh] w-[100vw] ${theme === 'dark' ? 'bg-[#0E001B]' : 'bg-gradient-to-b from-[#FFC362] to-[#9653D0]'}`}>
      <div className={`h-[100vh] w-[100%] ${theme === 'dark' ? transparentClasses : gradientClasses}`}>
        <Header />
        <div className="flex justify-center">
          <div className={`flex flex-col gap-6 w-[90%] h-[100%] md:w-[40%] ${theme === 'dark' ? "bg-[#240046]" : "bg-[#FFDEA8]/45"}  rounded-lg p-8`}>
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
              Student Login
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col gap-4 w-[100%] p-8 mx-auto">
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
                keyName="rollNumber"
                label="Roll Number"
                type="text"
              />
              <InputComponent
                width={100}
                state={formData}
                setState={setFormData}
                keyName="password"
                label="Password"
                type="password"
              />

              <div className='flex justify-center items-center'>
                <button
                  type="submit"
                  disabled={isLoading}
                  className={`mt-4 px-6 py-3 text-white font-semibold rounded-full transition-colors duration-300 focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed ${theme === 'dark'
                    ? 'bg-[#FF7900] hover:bg-[#E86C00] focus:ring-[#FF7900] disabled:hover:bg-[#FF7900]'
                    : 'bg-[#5A189A] hover:bg-[#4C1184] focus:ring-[#5A189A] disabled:hover:bg-[#5A189A]'
                    }`}
                >
                  {isLoading ? (
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      Logging in...
                    </div>
                  ) : (
                    'Login'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StudentLogin;
