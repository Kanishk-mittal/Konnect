import React, { useState, useContext } from 'react';
import styles from './Forgotpassword.module.css';
import { motion } from "framer-motion";
import { useNavigate } from 'react-router-dom';
import { FaUser } from "react-icons/fa";

const ForgotPassword = () => {
    return(
        <div className={styles.fContainer}>
            <div>
                <p>OTP will be sent to your Registered email.Please enter your registered Rollno to get OTP</p>
            </div>
            <div className={styles.fFlex}>
                        <motion.div className={styles.fFormGroup} initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 1.0 }}>
                          <label className={styles.fFormLabel}>Roll number</label>
                          <div className={styles.fOtpContainer}>
                            <input type="text" name="otp" className={styles.fFormInput}   placeholder="Rollnumber" />
                          </div>
                        </motion.div>
                        <motion.button 
                          type="button" 
                          className={styles.fOtpBtn} 
                          initial={{ y: 20, opacity: 0 }} 
                          animate={{ y: 0, opacity: 1 }} 
                          transition={{ delay: 1.1 }}
                        >
                          GET OTP
                        </motion.button>
                      </div>
            <div className={styles.fFlex}>
                        <motion.div className={styles.fFormGroup} initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 1.0 }}>
                          <label className={styles.fFormLabel}>OTP</label>
                          <div className={styles.fOtpContainer}>
                            <input type="text" name="otp" className={styles.fFormInput}   placeholder="Enter OTP" />
                          </div>
                        </motion.div>

                </div>
                <div className={styles.hide}>
                <div className={styles.fFlex1}>
                    <motion.div className={styles.fFormGroup} initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 1.2 }}>
                        <label className={styles.fFormLabel}>New Password</label>
                        <div className={styles.fOtpContainer}>
                            <input type="password" name="newPassword" className={styles.fFormInput} placeholder="Enter new password" />
                        </div>
                    </motion.div>
                    <motion.div className={styles.fFormGroup} initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 1.3 }}>
                        <label className={styles.fFormLabel}>Confirm Password</label>
                        <div className={styles.fOtpContainer}>
                            <input type="password" name="confirmPassword" className={styles.fFormInput} placeholder="Confirm new password" />
                        </div>
                    </motion.div>
                </div>
                <motion.button 
                    type="button" 
                    className={styles.fProceedBtn}
                    initial={{ y: 20, opacity: 0 }} 
                    animate={{ y: 0, opacity: 1 }} 
                    transition={{ delay: 1.4 }}
                >
                    Reset Password
                </motion.button>
                </div>
        </div>
    );
};
export default ForgotPassword;
