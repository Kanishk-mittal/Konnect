import React, { useState } from 'react';
import { motion } from "framer-motion";
import { useNavigate } from 'react-router-dom';
import { FaUser } from "react-icons/fa";
import Logo from "../src/assets/Logo.png";
import './Loginnew.css';
import JSEncrypt from "jsencrypt";
import { postData } from '../../../integration/apiService';

const LandingPage = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      const { public_key: publicKeyPem } = await postData('publicKey');
      const key = new JSEncrypt();
      key.setPublicKey(publicKeyPem);

      const encryptedEmail = key.encrypt(email, 'base64');
      const encryptedPassword = key.encrypt(password, 'base64');

      const response = await postData('login', {
        roll: encryptedEmail, // Assuming roll is used for email in this context
        password: encryptedPassword,
        publicKey: publicKeyPem
      });

      console.log('Login successful:', response);
      navigate('/chat'); // Redirect to chat page after successful login
    } catch (error) {
      console.error("Login error:", error);
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
            <motion.div className="form-group" initial={{ y: -20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 1.0 }}>
              <label className="form-label">College Email</label>
              <input
                type="email"
                className="form-input"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
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
            <motion.button type="submit" className="proceed-btn" initial={{ y: -20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 1.2 }}>
              Proceed
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
