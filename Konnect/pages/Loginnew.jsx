import React, { useState, useContext } from 'react';
import { motion } from "framer-motion";
import { useNavigate } from 'react-router-dom';
import { FaUser } from "react-icons/fa";
import Logo from "../src/assets/Logo.png";
import './Loginnew.css';
import JSEncrypt from "jsencrypt";
import CryptoJS from 'crypto-js';
import { AppContext } from '../src/context/AppContext';
import { postData } from '../Integration/apiService';

const LandingPage = () => {
  const navigate = useNavigate();
  const [rollNumber, setRollNumber] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  // Get context for storing encryption keys
  const { setPrivateKey, setDbKey, setServerKey } = useContext(AppContext);

  // Function to decrypt AES encrypted data
  const decryptWithAES = (encryptedData, key) => {
    if (!encryptedData) return null;
    try {
      // Convert the base64 encoded encrypted data to bytes
      const encryptedBytes = CryptoJS.enc.Base64.parse(encryptedData);
      
      // Split the encrypted data into the IV and the ciphertext
      const iv = encryptedBytes.clone();
      iv.sigBytes = 16; // AES block size is 16 bytes for IV
      iv.clamp();
      
      const ciphertext = encryptedBytes.clone();
      ciphertext.words.splice(0, 4); // Remove the first 4 words (16 bytes) which is the IV
      ciphertext.sigBytes -= 16;
      
      // Create decryption parameters
      const decryptParams = {
        iv: iv,
        mode: CryptoJS.mode.CBC,
        padding: CryptoJS.pad.Pkcs7
      };
      
      // Decrypt the data
      const decryptedData = CryptoJS.AES.decrypt(
        { ciphertext: ciphertext },
        CryptoJS.enc.Utf8.parse(key),
        decryptParams
      );
      
      return decryptedData.toString(CryptoJS.enc.Utf8);
    } catch (error) {
      return null;
    }
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

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // 1. Get server's public RSA key
      const { public_key: publicKeyPem } = await postData('publicKey');
      
      // 2. Generate client-side RSA key pair
      const { publicKey, privateKey } = generateRSAKeys();
      
      // 3. Set up encryption with server's public key
      const key = new JSEncrypt();
      key.setPublicKey(publicKeyPem);

      // 4. Encrypt credentials
      const encryptedRoll = key.encrypt(rollNumber, 'base64');
      const encryptedPassword = key.encrypt(password, 'base64');

      // 5. Send login request with our public key
      const response = await postData('login', {
        roll: encryptedRoll,
        password: encryptedPassword,
        publicKey: publicKey
      }, { credentials: 'include' });
      
      // 6. Decrypt the server's AES key using our private key
      const crypt = new JSEncrypt();
      crypt.setPrivateKey(privateKey);
      const serverAESKey = crypt.decrypt(response.key);
      
      if (!serverAESKey) {
        throw new Error("Failed to decrypt server AES key");
      }
      
      setServerKey(serverAESKey);
      
      // 7. Look for user-specific keys in localStorage
      const encryptedPrivateKey = localStorage.getItem(`encryptedPrivateKey_${rollNumber}`);
      const encryptedAESKey = localStorage.getItem(`encryptedAESKey_${rollNumber}`);
      
      let foundKeys = false;
      
      if (encryptedPrivateKey && encryptedAESKey) {
        try {
          // Decrypt the private key
          const decryptedPrivateKey = decryptWithAES(encryptedPrivateKey, serverAESKey);
          if (decryptedPrivateKey && decryptedPrivateKey.includes("-----BEGIN RSA PRIVATE KEY-----")) {
            setPrivateKey(decryptedPrivateKey);
            
            // Decrypt the AES key
            const decryptedAESKey = decryptWithAES(encryptedAESKey, serverAESKey);
            if (decryptedAESKey) {
              setDbKey(decryptedAESKey);
              foundKeys = true;
            }
          }
        } catch (error) {
          // Error handling is silent
        }
      }
      
      if (foundKeys) {
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

  // ...existing UI code...
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

export default LandingPage;
