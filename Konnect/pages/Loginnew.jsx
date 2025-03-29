import React from 'react';
import { motion } from "framer-motion";
import { useNavigate } from 'react-router-dom';
import { FaUser } from "react-icons/fa";
import Logo from "../src/assets/Logo.png";
import './Loginnew.css';

const LandingPage = () => {
  const navigate = useNavigate();
  return (
    <div className="Login-page">
         <motion.div className="Top-nav" initial={{ y: -20, opacity: 0 }}animate={{ y: 0, opacity: 1 }}transition={{ delay: 0.2 }}>
        <img src={Logo} alt="logo" className="logo" />
         </motion.div>
         <motion.div className= "container" initial={{ y: -20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.4 }}>
         <motion.div className="buttons" initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.6 }}>
          <button className=" login-button" onClick={() => navigate('/login')}><FaUser /> Login</button>
          <button className=" reg-button" onClick={() => navigate('/register')}><FaUser /> Register</button>
        </motion.div>
        <motion.div initial={{ y: -20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.9 }}>
        <form>
          <motion.div className="form-group" initial={{ y: -20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 1.0 }}>
            <label className="form-label">College Email</label>
            <input type="email" className="form-input" placeholder="Email" />
          </motion.div>
          <motion.div className="form-group" initial={{ y: -20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 1.1 }}>
            <label className="form-label">Password</label>
            <input type="password" className="form-input" placeholder="Password" />
          </motion.div>
          <motion.button type="submit" className="proceed-btn" onClick={() => navigate('/chat')} initial={{ y: -20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 1.2 }}>Proceed</motion.button>
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
