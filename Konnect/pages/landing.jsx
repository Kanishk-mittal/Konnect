import React from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { FaUser } from "react-icons/fa";
import Bg from "../src/assets/LandBg.png";
import Logo from "../src/assets/Logo.png";
import styles from  "./landing.module.css"; 
const Landing = () => {
    const navigate = useNavigate();
  return (
    <motion.div className={styles.landcontainter}  initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <motion.div className={styles.Topnav} initial={{ y: -20, opacity: 0 }} animate={{ y: 0, opacity: 1 }}transition={{ delay: 0.2 }}>
        <img src={Logo} alt="logo" className="logo" />
      </motion.div>
      <motion.div className={styles.card} initial={{ y: -20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.4 }}>
          <p className={styles.description}>
            Fast, secure, and seamless chat platform built for our college. Stay connected, collaborate effortlessly, and engage with peers in a private and interactive space
          </p>
        </motion.div>
        <motion.div className={styles.card1} initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.6 }}>
        <button onClick={() => navigate("/login")} className={styles.loginbuttonhome}>
        <FaUser /> Login
        </button>
        <button onClick={() => navigate("/register")} className={styles.regbuttonhome}>
          <FaUser /> Register
        </button>
        </motion.div>
    </motion.div>
  );
};
export default Landing;
