import React, { useState, useEffect, useContext } from "react";
import { useNavigate } from "react-router-dom"; // Add this import
import Header from "./Header.jsx";
import styles from "./Psettings.module.css";
import { AppContext } from "../src/context/AppContext";
import { getData, postData, getPublicKey } from '../Integration/apiService';
import CryptoJS from 'crypto-js';
import JSEncrypt from "jsencrypt";

function Psettings() {
  const navigate = useNavigate(); // Add this line
  const [profileData, setProfileData] = useState({
    username: '',
    email: '',
    description: ''
  });
  
  const { privateKey, dbKey } = useContext(AppContext);
  const [copyStatus, setCopyStatus] = useState(false);
  const [passwordData, setPasswordData] = useState({
    newPassword: '',
    confirmPassword: '',
    otp: ''
  });
  const [otpSent, setOtpSent] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [formChanged, setFormChanged] = useState({
    username: false,
    description: false
  });

  // Fetch full profile (including email) on component mount
  useEffect(() => {
    async function fetchProfile() {
      try {
        const data = await getData('get_profile');
        setProfileData({
          username: data.name || '',
          email: data.email || '',
          description: data.description || ''
        });
      } catch (error) {
        console.error("Failed to fetch profile", error);
      }
    }
    fetchProfile();
  }, []);

  const copyBothKeys = () => {
    if (!privateKey || !dbKey) return;
    
    // Combine both keys with labels and a separator
    const combinedText = 
      `PRIVATE KEY:\n${privateKey}\n\nDATABASE KEY:\n${dbKey}`;
    
    navigator.clipboard.writeText(combinedText)
      .then(() => {
        setCopyStatus(true);
        
        // Reset the copied status after 2 seconds
        setTimeout(() => {
          setCopyStatus(false);
        }, 2000);
      })
      .catch(err => {
        console.error('Failed to copy keys: ', err);
      });
  };

  const handlePasswordChange = (e) => {
    setPasswordData({
      ...passwordData,
      [e.target.name]: e.target.value
    });
  };

  const handleInputChange = (e) => {
    const { id, value } = e.target;
    if (id === "username") {
      setProfileData(prev => ({...prev, username: value}));
      setFormChanged(prev => ({...prev, username: true}));
    }
  };

  const handleDescriptionChange = (e) => {
    setProfileData(prev => ({...prev, description: e.target.value}));
    setFormChanged(prev => ({...prev, description: true}));
  };

  const handleGetOTP = async () => {
    setPasswordLoading(true);
    try {
      // Use the user's email from profileData similar to Register.jsx
      if (!profileData.email) {
        setPasswordError("Email not available. Please update your profile.");
        setPasswordLoading(false);
        return;
      }
      const response = await postData('otp', { email: profileData.email });
      setOtpSent(true);
      setPasswordError('');
    } catch (error) {
      setPasswordError(error.response?.data?.msg || "Failed to send OTP. Please try again.");
    } finally {
      setPasswordLoading(false);
    }
  };

  const handleSaveAll = async (e) => {
    e.preventDefault();
    setFieldErrors({}); // clear previous field errors
    setPasswordError(''); // clear any existing errors
    
    // Ensure username is not empty
    if (!profileData.username || profileData.username.trim() === "") {
      setFieldErrors(prev => ({ ...prev, username: "Username should not be empty" }));
      return;
    }

    // Validate password fields if new password is provided
    if (passwordData.newPassword.trim() !== "") {
      if (passwordData.newPassword !== passwordData.confirmPassword) {
        setFieldErrors(prev => ({ ...prev, confirmPassword: "Passwords do not match" }));
        return;
      }
      if (passwordData.otp.trim() === "") {
        setFieldErrors(prev => ({ ...prev, otp: "OTP is required for password change" }));
        return;
      }
    }
    
    // Set loading state 
    setPasswordLoading(true);
    
    try {
      // Fetch public key from the backend
      const publicKey = await getPublicKey();
  
      // Generate a random AES key
      const aesKey = CryptoJS.enc.Base64.stringify(CryptoJS.lib.WordArray.random(16));
  
      // Encrypt the AES key using the server's public key
      const encryptor = new JSEncrypt();
      encryptor.setPublicKey(publicKey);
      const encryptedAESKey = encryptor.encrypt(aesKey,'base64');
  
      // Create payload inline with all fields encrypted using the AES key
      const payload = {
        aesKey: encryptedAESKey // Include the encrypted AES key
      };

      // Add username only if it's changed
      if (formChanged.username) {
        payload.username = CryptoJS.AES.encrypt(profileData.username.trim(), CryptoJS.enc.Base64.parse(aesKey), {
          mode: CryptoJS.mode.CBC,
          padding: CryptoJS.pad.Pkcs7,
          iv: CryptoJS.lib.WordArray.random(16)
        }).toString();
      }
      
      // Add description only if it's changed
      if (formChanged.description && profileData.description) {
        payload.description = CryptoJS.AES.encrypt(profileData.description.trim(), CryptoJS.enc.Base64.parse(aesKey), {
          mode: CryptoJS.mode.CBC,
          padding: CryptoJS.pad.Pkcs7,
          iv: CryptoJS.lib.WordArray.random(16)
        }).toString();
      }
      
      // Add password fields if provided
      if (passwordData.newPassword.trim() !== "") {
        payload.newPassword = CryptoJS.AES.encrypt(passwordData.newPassword, CryptoJS.enc.Base64.parse(aesKey), {
          mode: CryptoJS.mode.CBC,
          padding: CryptoJS.pad.Pkcs7,
          iv: CryptoJS.lib.WordArray.random(16)
        }).toString();
        
        payload.otp = CryptoJS.AES.encrypt(passwordData.otp, CryptoJS.enc.Base64.parse(aesKey), {
          mode: CryptoJS.mode.CBC,
          padding: CryptoJS.pad.Pkcs7,
          iv: CryptoJS.lib.WordArray.random(16)
        }).toString();
      }

      console.log("Sending payload:", Object.keys(payload));
  
      // Send the encrypted payload to the backend
      const response = await postData('update_profile', payload, { credentials: 'include' });
      
      // Reset the changed flags after successful update
      setFormChanged({username: false, description: false});
      
      // Clear password fields after successful update
      if (passwordData.newPassword.trim() !== "") {
        setPasswordData({
          newPassword: '',
          confirmPassword: '',
          otp: ''
        });
        setOtpSent(false);
      }
      
      // Show success message and navigate on OK
      alert('Profile updated successfully!');
      navigate('/profile'); // Navigate to profile page after successful update
      
    } catch (error) {
      console.error("Failed to update profile:", error);
      setPasswordError(error.response?.data?.error || "Failed to save changes. Please try again.");
    } finally {
      setPasswordLoading(false);
    }
  };

  return (
    <div className={styles.fullpage}>
      <div className={styles.settingsPage}>
        <div className={styles.header}>
          <Header/>
        </div>
        <div className={styles.profileSettings}>
          <p> Profile Settings </p>
        </div>
        
        <form onSubmit={handleSaveAll}>
          <div className={styles.username}>
            <div className={styles.name}>
              <p> User name </p>
            </div>
            <div className={styles.userform}>
              <input 
                type="text" 
                id="username" 
                value={profileData.username}
                onChange={handleInputChange}
              />
              {fieldErrors.username && (
                <span className={styles.errorText}>{fieldErrors.username}</span>
              )}
            </div>
          </div>
          
          <div>
            <p className={styles.name}>About</p>
            <textarea 
              className={styles.text2} 
              value={profileData.description || ''}
              onChange={handleDescriptionChange}
            />
          </div>
          
          {/* Password Change Section */}
          <div className={styles.passwordSection}>
            <p className={styles.name}>Change Password</p>
            
            {/* Existing general error can remain or be removed if errors are now inline */}
            {passwordError && <div className={styles.errorMessage}>{passwordError}</div>}
            
            <div className={styles.passwordField}>
              <label>New Password</label>
              <input 
                type="password" 
                name="newPassword" 
                value={passwordData.newPassword}
                onChange={handlePasswordChange}
                placeholder="Enter new password"
                className={styles.passwordInput}
              />
            </div>
            
            <div className={styles.passwordField}>
              <label>Confirm New Password</label>
              <input 
                type="password" 
                name="confirmPassword" 
                value={passwordData.confirmPassword}
                onChange={handlePasswordChange}
                placeholder="Confirm new password"
                className={styles.passwordInput}
              />
              {fieldErrors.confirmPassword && (
                <span className={styles.errorText}>{fieldErrors.confirmPassword}</span>
              )}
            </div>
            
            <div className={styles.otpContainer}>
              <div className={styles.otpField}>
                <label>OTP</label>
                <input 
                  type="text" 
                  name="otp" 
                  value={passwordData.otp}
                  onChange={handlePasswordChange}
                  placeholder="Enter OTP"
                  className={styles.passwordInput}
                />
                {fieldErrors.otp && (
                  <span className={styles.errorText}>{fieldErrors.otp}</span>
                )}
              </div>
              <button 
                type="button" 
                className={styles.otpButton}
                onClick={handleGetOTP}
                disabled={passwordLoading}
              >
                {passwordLoading && !otpSent ? 'Sending...' : otpSent ? 'Resend OTP' : 'Get OTP'}
              </button>
            </div>
          </div>
          
          {/* Save Button */}
          <button 
            type="submit" 
            className={`${styles.btn} ${styles.btn1}`}
            disabled={passwordLoading}
          >
            {passwordLoading ? 'Saving...' : 'Save'}
          </button>
        </form>
        
        {/* Security Keys Section */}
        <div className={styles.keysSection}>
          <p className={styles.name}>Security Keys</p>
          
          <div className={styles.keysInfo}>
            <p><strong>IMPORTANT:</strong> These encryption keys protect your messages and data.</p>
            <p>Make sure to:</p>
            <ul>
              <li>Copy and store these keys in a secure password manager</li>
              <li>Never share these keys with anyone</li>
              <li>Keep these keys available for account recovery if you change devices</li>
              <li>Without these keys, your encrypted data cannot be recovered</li>
            </ul>
          </div>
          
          <button 
            className={styles.backupButton}
            onClick={copyBothKeys}
            disabled={!privateKey || !dbKey}
          >
            {copyStatus ? "Keys Copied!" : "Copy Keys"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default Psettings;
