import React, { useState, useContext } from 'react';
import { motion } from "framer-motion";
import { FaUser } from "react-icons/fa";
import { useNavigate } from 'react-router-dom';
import Logo from "../src/assets/Logo.png";
import './Register.css';
import JSEncrypt from "jsencrypt";
import CryptoJS from 'crypto-js';
import { AppContext } from '../src/context/AppContext';
import { postData } from '../Integration/apiService';

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
  const [loading, setLoading] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [error, setError] = useState('');
  const [rollError, setRollError] = useState('');
  
  // Get context for storing encryption keys
  const { setPrivateKey, setDbKey, setServerKey } = useContext(AppContext);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
    
    // Clear roll error when user changes roll number
    if (e.target.name === 'rollNumber') {
      setRollError('');
    }
  };

  // Transform roll number function
  const transformRollNumber = (rollNumber) => {
    if (!rollNumber) return '';
    
    // 1. Remove first two characters
    let transformed = rollNumber.substring(2);
    
    // 2. Remove all 0's
    transformed = transformed.replace(/0/g, '');
    
    // 3. Convert to lowercase
    transformed = transformed.toLowerCase();
    
    return transformed;
  };

  // Validate roll number against email
  const validateRollWithEmail = (rollNumber, email) => {
    if (!rollNumber) {
      setRollError('Please enter your roll number to proceed');
      return false;
    }
    
    const transformedRoll = transformRollNumber(rollNumber);
    
    if (!email.includes(transformedRoll)) {
      setRollError('Please use your own college ID. The roll number should match your email.');
      return false;
    }
    
    return true;
  };

  // Generate random AES key for local storage encryption
  const generateAESKey = () => {
    const randomBytes = CryptoJS.lib.WordArray.random(16);
    return CryptoJS.enc.Base64.stringify(randomBytes);
  };

  // Generate RSA key pair
  const generateRSAKeys = () => {
    const crypt = new JSEncrypt({ default_key_size: 2048 });
    crypt.getKey();
    return {
      publicKey: crypt.getPublicKey(),
      privateKey: crypt.getPrivateKey()
    };
  };

  // Encrypt data with AES
  const encryptWithAES = (data, key) => {
    if (!data) return null;
    try {
      // Generate a random IV
      const iv = CryptoJS.lib.WordArray.random(16);
      
      // Create encryption parameters
      const encryptParams = {
        iv: iv,
        mode: CryptoJS.mode.CBC,
        padding: CryptoJS.pad.Pkcs7
      };
      
      // Encrypt the data
      const encrypted = CryptoJS.AES.encrypt(
        data,
        CryptoJS.enc.Utf8.parse(key),
        encryptParams
      );
      
      // Combine IV and ciphertext and convert to base64
      const ivAndCiphertext = iv.concat(encrypted.ciphertext);
      return CryptoJS.enc.Base64.stringify(ivAndCiphertext);
    } catch (error) {
      return null;
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setRollError('');
    
    if (!validateRollWithEmail(formData.rollNumber, formData.email)) {
      return;
    }
    
    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match");
      setLoading(false);
      return;
    }
    
    try {
      // 1. Get server's public RSA key
      const { public_key: publicKeyPem } = await postData('publicKey');
      
      // 2. Generate client-side RSA key pair
      const { publicKey, privateKey } = generateRSAKeys();
      
      // 3. Generate user's AES key for local storage encryption
      const userAESKey = generateAESKey();
      
      // 4. Set up encryption with server's public key
      const key = new JSEncrypt();
      key.setPublicKey(publicKeyPem);

      // 5. Encrypt all user data with server's RSA key
      const encryptedData = {
        name: key.encrypt(formData.name),
        roll: key.encrypt(formData.rollNumber),
        email: key.encrypt(formData.email),
        otp: formData.otp,
        password: key.encrypt(formData.password),
        publicKey: publicKey
      };

      // 6. Send registration request
      const response = await postData('register', encryptedData, { credentials: 'include' });
      
      // 7. Decrypt the returned server AES key using user's private key
      const decrypt = new JSEncrypt();
      decrypt.setPrivateKey(privateKey);
      const serverAESKey = decrypt.decrypt(response.key);
      
      if (!serverAESKey) {
        throw new Error("Failed to decrypt server AES key");
      }
      
      // 8. Encrypt private key and user AES key for storage
      const encryptedPrivateKey = encryptWithAES(privateKey, serverAESKey);
      const encryptedUserAESKey = encryptWithAES(userAESKey, serverAESKey);
      
      // 9. Store encrypted keys with user-specific names using roll number
      localStorage.setItem(`encryptedPrivateKey_${formData.rollNumber}`, encryptedPrivateKey);
      localStorage.setItem(`encryptedAESKey_${formData.rollNumber}`, encryptedUserAESKey);
      
      // 10. Set keys in context
      setServerKey(serverAESKey);
      setPrivateKey(privateKey);
      setDbKey(userAESKey);
      
      navigate('/chat'); // Redirect to chat page after successful registration
    } catch (error) {
      setError(error.response?.data?.msg || "Registration failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleGetOTP = async () => {
    setError('');
    setRollError('');
    
    if (!formData.email) {
      setError("Please enter your email address");
      return;
    }
    
    if (!formData.rollNumber) {
      setRollError("Please enter your roll number to proceed");
      return;
    }
    
    // Validate roll number against email
    if (!validateRollWithEmail(formData.rollNumber, formData.email)) {
      return;
    }
    
    setLoading(true);
    try {
      const response = await postData('otp', { email: formData.email });
      setOtpSent(true);
      setError('');
    } catch (error) {
      setError(error.response?.data?.msg || "Failed to send OTP. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = () => {
    navigate('/login'); // Redirect to login page
  };

  // ...existing UI code...
  return (
    <div className="register-container">
      <motion.div className="Top-nav" initial={{ y: -20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.2 }}>
        <img src={Logo} alt="logo" className="logo" />
      </motion.div>
      <motion.div className="container1" initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.4 }}>
        <motion.div className="buttons1" initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.6 }}>
          <button className="login-button1" onClick={handleLogin}><FaUser /> Login</button>
          <button className="reg-button1" onClick={() => navigate('/register')}><FaUser /> Register</button>
        </motion.div>
        <form onSubmit={handleSubmit}>
          {error && <div className="error-message">{error}</div>}
          <div className="Flex">
            <motion.div className="form-group" initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.7 }}>
              <label className="form-label">Name</label>
              <input type="text" name="name" className="form-input1" value={formData.name} onChange={handleChange} placeholder="Name" />
            </motion.div>

            <motion.div className="form-group" initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.8 }}>
              <label className="form-label">Roll number</label>
              <input type="text" name="rollNumber" className="form-input1" value={formData.rollNumber} onChange={handleChange} placeholder="Roll number" />
              {rollError && <div className="error-message" style={{color: 'red', fontSize: '12px'}}>{rollError}</div>}
            </motion.div>
          </div>
          <motion.div className="form-group" initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.9 }}>
            <label className="form-label">College Mail</label>
            <input type="email" name="email" className="form-input1" value={formData.email} onChange={handleChange} placeholder="Email" />
          </motion.div>
          <div className="Flex">
            <motion.div className="form-group" initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 1.0 }}>
              <label className="form-label">OTP</label>
              <div className="otp-container">
                <input type="text" name="otp" className="form-input1" value={formData.otp} onChange={handleChange} placeholder="OTP" />
              </div>
            </motion.div>
            <motion.button 
              type="button" 
              className="otp-btn" 
              onClick={handleGetOTP} 
              disabled={loading}
              initial={{ y: 20, opacity: 0 }} 
              animate={{ y: 0, opacity: 1 }} 
              transition={{ delay: 1.1 }}
            >
              {loading && !otpSent ? 'Sending...' : otpSent ? 'Resend OTP' : 'Get OTP'}
            </motion.button>
          </div>
          <div className="Flex">
            <motion.div className="form-group" initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 1.2 }}>
              <label className="form-label">Password</label>
              <input type="password" name="password" className="form-input1" value={formData.password} onChange={handleChange} placeholder="Password" />
            </motion.div>
            <motion.div className="form-group" initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 1.3 }}>
              <label className="form-label">Confirm Password</label>
              <input type="password" name="confirmPassword" className="form-input1" value={formData.confirmPassword} onChange={handleChange} placeholder="Confirm Password" />
            </motion.div>
          </div>
          <motion.button 
            type="submit" 
            className="proceed-btn1" 
            disabled={loading}
            initial={{ y: 20, opacity: 0 }} 
            animate={{ y: 0, opacity: 1 }} 
            transition={{ delay: 1.4 }}
          >
            {loading ? 'Processing...' : 'Proceed'}
          </motion.button>
          <motion.div className="login-link" initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 1.5 }}>
            Have an account? <a href="#" onClick={handleLogin}> -Login</a>
          </motion.div>
        </form>
      </motion.div>
    </div>
  );
};

export default Register;



