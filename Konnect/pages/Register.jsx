import React, { useState } from 'react';
import { motion } from "framer-motion";
import { FaUser } from "react-icons/fa";
import { useNavigate } from 'react-router-dom';
import Logo from "../src/assets/Logo.png";
import './Register.css';

const Register = ({ style = {} }) => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: '',
    rollNumber: '',
    email: '',
    otp: '',
    password: '',
    confirmPassword: ''
  });

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    // Handle form submission
  };

  const handleGetOTP = () => {
    // Handle OTP generation
  };
// handele login route 
  const handleLogin = () => {
    console.log("Login button clicked");
    navigate('/Login'); // Redirect to login page
  };

  return (
    <div className="register-container">
        <motion.div className="Top-nav" initial={{ y: -20, opacity: 0 }}animate={{ y: 0, opacity: 1 }}transition={{ delay: 0.2 }}>
        <img src={Logo} alt="logo" className="logo" />
         </motion.div>
      <motion.div className="container1" initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.4 }} >
        <motion.div className="buttons1" initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.6 }}>
        <button className=" login-button1" onClick={() => navigate('/login')}><FaUser /> Login</button>
        <button className=" reg-button1" onClick={() => navigate('/register')}><FaUser /> Register</button>
        </motion.div>
        <form onSubmit={handleSubmit}>
            <div className="Flex">
            <motion.div className="form-group" initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.7 }}>
            <label className="form-label">Name</label>
            <input type="text" name="name" className="form-input1" value={formData.name} onChange={handleChange} placeholder="Name"/>
          </motion.div>

          <motion.div className="form-group"initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.8 }}>
            <label className="form-label">Roll number</label>
            <input type="text" name="rollNumber" className="form-input1" value={formData.rollNumber} onChange={handleChange} placeholder="Roll number"/>
          </motion.div>
            </div>
          <motion.div className="form-group" initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.9 }}>
            <label className="form-label">College Mail</label>
            <input type="email" name="email" className="form-input1" value={formData.email} onChange={handleChange} placeholder="Email"/>
          </motion.div>
          <div className="Flex">
          <motion.div className="form-group" initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 1.0 }}>
            <label className="form-label">OTP</label>
            <div className="otp-container">
              <input type="text" name="otp" className="form-input1" value={formData.otp} onChange={handleChange} placeholder="OTP"/>
            </div>
          </motion.div>
          <motion.button type="button" className="otp-btn" onClick={handleGetOTP} initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 1.1 }}>Get OTP</motion.button>
          </div>
          <div className="Flex">
          <motion.div className="form-group" initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 1.2 }}>
            <label className="form-label">Password</label>
            <input type="password" name="password" className="form-input1" value={formData.password} onChange={handleChange} placeholder="Password"/>
          </motion.div>
          <motion.div className="form-group" initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 1.3 }}>
            <label className="form-label">Confirm Password</label>
            <input type="password" name="confirmPassword" className="form-input1" value={formData.confirmPassword} onChange={handleChange} placeholder="Confirm Password"/>
          </motion.div>
          </div>
          <motion.button type="submit" className="proceed-btn1"initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 1.4 }}>Proceed</motion.button>
          <motion.div className="login-link"initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 1.5 }}>
             Have an account? <a href="#" onClick={() => navigate('/login')}> -Login</a>
          </motion.div>
        </form>
      </motion.div>
    </div>
  );
};
export default Register;



