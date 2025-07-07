import { useSelector, useDispatch } from 'react-redux';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../components/Header';
import type { RootState } from '../store/store';
import InputComponent from '../components/InputComponent';
import { setEmail } from '../store/authSlice';

const AdminRegistration = () => {
  const theme = useSelector((state: RootState) => state.theme.theme);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const gradientClasses = "bg-[radial-gradient(circle,_rgba(255,255,255,0.3)_0%,_rgba(219,178,255,0.3)_55%,_rgba(219,178,255,0.3)_100%)]"
  const transparentClasses = "bg-transparent"

  const [formData, setFormData] = useState({
    collegeName: '',
    adminUsername: '',
    collegeCode: '',
    emailId: '',
    password: '',
    confirmPassword: ''
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Form submitted:', formData);
    
    // Store email in Redux
    dispatch(setEmail(formData.emailId));
    
    // Navigate to OTP verification page
    navigate('/otp-verification', { state: { nextPage: '/admin/dashboard' } });
  };

  return (
    <>
      <div className={`min-h-[100vh] w-[100vw] ${theme === 'dark' ? 'bg-[#0E001B]' : 'bg-gradient-to-b from-[#FFC362] to-[#9653D0]'}`}>
        <div className={` h-[100%] w-[100%] ${theme === 'dark' ? transparentClasses : gradientClasses}`}>
          <Header />
          <div className="flex justify-center">
            <div className={`flex flex-col gap-6 w-[80%] min-h-[200px] ${theme === 'dark' ? "bg-[#240046]" : "bg-[#FFDEA8]/45"}  rounded-lg p-8`}>
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
                    className={`mt-4 px-6 py-3 text-white font-semibold rounded-full transition-colors duration-300 focus:ring-2 focus:ring-offset-2 ${
                      theme === 'dark' 
                        ? 'bg-[#FF7900] hover:bg-[#E86C00] focus:ring-[#FF7900]' 
                        : 'bg-[#5A189A] hover:bg-[#4C1184] focus:ring-[#5A189A]'
                    }`}
                  >
                    Get Otp
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

export default AdminRegistration;
