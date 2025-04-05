import React, { useState } from 'react';
import { motion } from "framer-motion";
import { useNavigate } from 'react-router-dom';
import { FaUser } from "react-icons/fa";
import Logo from "../src/assets/Logo.png";
import './Login.css';
import { postData } from '../Integration/apiService';
import { decryptWithAES, generateRSAKeys, decryptWithRSA, encryptWithRSA } from '../Integration/Encryption.js';

const Login = () => {
  const navigate = useNavigate();
  const [rollNumber, setRollNumber] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // 1. Get server's public RSA key
      const { public_key: publicKeyPem } = await postData('publicKey');
      
      // 2. Generate client-side RSA key pair
      const { publicKey, privateKey } = generateRSAKeys();

      // 3. Encrypt the roll number and password using the server's public key
      const encryptedRoll = encryptWithRSA(rollNumber, publicKeyPem);
      const encryptedPassword = encryptWithRSA(password, publicKeyPem);

      // 4. Send login request with our public key
      const response = await postData('login', {
        roll: encryptedRoll,
        password: encryptedPassword,
        publicKey: publicKey
      }, { credentials: 'include' });
      
      // 5. Decrypt the server's AES key using our private key
      const serverAESKey = decryptWithRSA(response.key, privateKey);
      
      if (!serverAESKey) {
        alert("Failed to decrypt server AES key. Please try again.");
      }
      
      // 7. Look for user-specific keys in localStorage
      const encryptedPrivateKey = localStorage.getItem(`encryptedPrivateKey_${rollNumber}`);
      const encryptedAESKey = localStorage.getItem(`encryptedAESKey_${rollNumber}`);
      
      let foundKeys = false;
      if (encryptedPrivateKey && encryptedAESKey) {
        try {
          // Decrypt the private key
          const decryptedPrivateKey = decryptWithAES(encryptedPrivateKey, serverAESKey);
          
          if (decryptedPrivateKey && decryptedPrivateKey.includes("-----BEGIN RSA PRIVATE KEY-----")) {
            // Decrypt the AES key
            const decryptedAESKey = decryptWithAES(encryptedAESKey, serverAESKey);
            
            if (decryptedAESKey) {
              foundKeys = true;
            }
          }
        } catch (error) {
          setError("Failed to decrypt keys. Please try again.");
        }
      }
      
      if (foundKeys) {
        alert("Login successful!");
        navigate('/chat'); // Redirect to chat page after successful login
      } else {
        // If we can't find stored keys, user may need to register first
        setError("Could not find your stored keys. Please register first.");
      }
    } catch (error) {
      setError(error.response?.data?.msg || "Login failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="Login-page">
      <motion.div className="Top-nav" initial={{ y: -20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.2 }}>
        <img src={Logo} alt="logo" className="logo" />
      </motion.div>
      <motion.div className="container" initial={{ y: -20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.4 }}>
        <motion.div className="buttons" initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.6 }}>
          <button className="login-button" onClick={() => navigate('/login')}><FaUser /> Login</button>
          <button className="reg-button" onClick={() => navigate('/register')}><FaUser /> Register</button>
        </motion.div>
        <motion.div initial={{ y: -20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.9 }}>
          <form onSubmit={handleLogin}>
            {error && <div className="error-message">{error}</div>}
            <motion.div className="form-group" initial={{ y: -20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 1.0 }}>
              <label className="form-label">Roll Number</label>
              <input
                type="text"
                className="form-input"
                placeholder="Enter your roll number"
                value={rollNumber}
                onChange={(e) => setRollNumber(e.target.value)}
              />
            </motion.div>
            <motion.div className="form-group" initial={{ y: -20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 1.1 }}>
              <label className="form-label">Password</label>
              <input
                type="password"
                className="form-input"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <motion.div 
                className="forgot-password-link" 
                initial={{ y: -10, opacity: 0 }} 
                animate={{ y: 0, opacity: 1 }} 
                transition={{ delay: 1.15 }}
              >
                <a href="/forgot_password">Forgot Password?</a>
              </motion.div>
            </motion.div>
            <motion.button 
              type="submit" 
              className="proceed-btn" 
              initial={{ y: -20, opacity: 0 }} 
              animate={{ y: 0, opacity: 1 }} 
              transition={{ delay: 1.2 }}
              disabled={loading}
            >
              {loading ? 'Logging in...' : 'Proceed'}
            </motion.button>
            <motion.div className="register-link" initial={{ y: -20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 1.3 }}>
              Don't have an account? <a href="#" onClick={() => navigate('/register')}> - Register Now</a>
            </motion.div>
          </form>
        </motion.div>
      </motion.div>
    </div>
  );
};

export default Login;
