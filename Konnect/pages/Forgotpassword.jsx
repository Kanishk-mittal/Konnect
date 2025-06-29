import React, { useState, useContext } from 'react';
import styles from './Forgotpassword.module.css';
import { motion } from "framer-motion";
import { postData } from '../Integration/apiService';
import { useNavigate } from 'react-router-dom';
import { encryptWithRSA } from '../Integration/Encryption';

const ForgotPassword = () => {
  const [roll, setRoll] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const sendOTP = async () => {
    if (roll.length == 0) {
      alert("Please enter your roll number ")
      return;
    }
    setLoading(true);
    try {
      const response = await postData('otp', { 'roll_number': roll });
      console.log(response.status)
      if (response.msg) {
        alert(response.msg)
      } else if (response.err) {
        alert(response.err)
      }
    } catch (error) {
      alert("Failed to send OTP. Please try again.");
      console.error(error);
    } finally {
      setLoading(false);
    }
  }

  const resetPassword = async () => {
    // Validation
    if (!roll || !otp || !newPassword || !confirmPassword) {
      alert("Please fill in all fields");
      return;
    }

    if (newPassword !== confirmPassword) {
      alert("Passwords do not match");
      return;
    }

    setLoading(true);
    try {
      // Fetch the server's public key
      const keyResponse = await postData('publicKey', {});
      if (!keyResponse.public_key) {
        throw new Error('Failed to get server public key');
      }

      // Encrypt sensitive data with the correct attribute names matching the backend
      const encryptedRoll = encryptWithRSA(roll, keyResponse.public_key);
      const encryptedPassword = encryptWithRSA(newPassword, keyResponse.public_key);
      const encryptedOTP = encryptWithRSA(otp, keyResponse.public_key);

      console.log("Sending encrypted data:", {
        roll: encryptedRoll,
        password: encryptedPassword,
        otp: encryptedOTP
      });

      // Send request to update password - the backend expects base64 data
      const response = await postData('update_password', {
        roll: encryptedRoll,
        password: encryptedPassword,
        otp: encryptedOTP
      });

      console.log("Password reset response:", response);

      if (response.message) {
        alert("Password changed successfully!");
        navigate('/login');
      } else if (response.error) {
        alert(response.error);
      }
    } catch (error) {
      alert("Failed to reset password. Please try again.");
      console.error("Reset password error:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.fContainer}>
      <div>
        <p>OTP will be sent to your Registered email.Please enter your registered Rollno to get OTP</p>
      </div>
      <div className={styles.fFlex}>
        <motion.div className={styles.fFormGroup} initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 1.0 }}>
          <label className={styles.fFormLabel}>Roll number</label>
          <div className={styles.fOtpContainer}>
            <input type="text" name="roll" className={styles.fFormInput} value={roll} onChange={(e) => {setRoll(e.target.value)}} placeholder="Rollnumber" />
          </div>
        </motion.div>
        <motion.button
          type="button"
          className={styles.fOtpBtn}
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 1.1 }}
          onClick={sendOTP}
          disabled={loading}
        >
          {loading ? "SENDING..." : "GET OTP"}
        </motion.button>
      </div>
      <div className={styles.fFlex}>
        <motion.div className={styles.fFormGroup} initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 1.0 }}>
          <label className={styles.fFormLabel}>OTP</label>
          <div className={styles.fOtpContainer}>
            <input type="text" name="otp" className={styles.fFormInput} placeholder="Enter OTP" value={otp} onChange={(e)=>{setOtp(e.target.value)}} />
          </div>
        </motion.div>

      </div>
      <div className={styles.fFlex1}>
        <div className={styles.fFlex}>
          <motion.div className={styles.fFormGroup} initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 1.2 }}>
            <label className={styles.fFormLabel}>New Password</label>
            <div className={styles.fOtpContainer}>
              <input type="password" name="newPassword" className={styles.fFormInput} placeholder="Enter new password" value={newPassword} onChange={(e)=>{setNewPassword(e.target.value)}} />
            </div>
          </motion.div>
          <motion.div className={styles.fFormGroup} initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 1.3 }}>
            <label className={styles.fFormLabel}>Confirm Password</label>
            <div className={styles.fOtpContainer}>
              <input type="password" name="confirmPassword" className={styles.fFormInput} placeholder="Confirm new password" value={confirmPassword} onChange={(e)=> {setConfirmPassword(e.target.value)}} />
            </div>
          </motion.div>
        </div>
        <motion.button
          type="button"
          className={styles.fProceedBtn}
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 1.4 }}
          onClick={resetPassword}
          disabled={loading}
        >
          {loading ? "Processing..." : "Reset Password"}
        </motion.button>
      </div>
    </div>
  );
};
export default ForgotPassword;
