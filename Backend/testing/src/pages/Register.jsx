import React, { useState } from 'react';
import axios from 'axios';
import JSEncrypt from 'jsencrypt';
import CryptoJS from 'crypto-js';
import { useNavigate } from 'react-router-dom';

const Register = () => {
    const navigate = useNavigate();
    const [formData, setFormData] = useState({
        name: '',
        roll: '',
        email: '',
        password: '',
    });
    const [rollAvailable, setRollAvailable] = useState(true);
    const [checkingRoll, setCheckingRoll] = useState(false);

    const instance = axios.create({
        withCredentials: true,
        baseURL: "http://localhost:5000",
        mode: 'cors',
        headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'X-Requested-With': 'XMLHttpRequest'
        }
    });

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData({
            ...formData,
            [name]: value
        });
    };

    const generateRSAKeys = () => {
        const crypt = new JSEncrypt({ default_key_size: 2048 }); // 2048-bit key
        crypt.getKey(); // Generates the key pair

        const publicKey = crypt.getPublicKey();
        const privateKey = crypt.getPrivateKey();

        return { publicKey, privateKey };
    };

    const generateAESKey = () => {
        // Generate a random 16-byte (128-bit) key
        const randomBytes = CryptoJS.lib.WordArray.random(16);
        return CryptoJS.enc.Base64.stringify(randomBytes);
    };

    const encryptWithAES = (data, key) => {
        if (!data) return null;
        try {
            // Generate a random IV
            const iv = CryptoJS.lib.WordArray.random(16); // 16 bytes for AES
            
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
            console.error('Encryption failed:', error);
            return null;
        }
    };

    // Add a debounced function to check roll availability
    const checkRollAvailability = async (roll) => {
        if (!roll || roll.trim() === '') return;
        
        try {
            setCheckingRoll(true);
            
            // Get server's public key first
            const keyResponse = await axios.post('http://localhost:5000/publicKey', {}, {
                withCredentials: true
            });
            const serverPublicKey = keyResponse.data.public_key;
            
            // Encrypt the roll number
            const rsaEncrypt = new JSEncrypt();
            rsaEncrypt.setPublicKey(serverPublicKey);
            const encryptedRoll = rsaEncrypt.encrypt(roll);
            
            // Check if the roll exists
            const response = await instance.post('/check_roll', {
                roll: encryptedRoll
            });
            
            setRollAvailable(response.data.available);
        } catch (error) {
            console.error('Error checking roll availability:', error);
            // Assume available if there's an error checking
            setRollAvailable(true);
        } finally {
            setCheckingRoll(false);
        }
    };
    
    // Add useEffect to check roll when it changes
    React.useEffect(() => {
        const timer = setTimeout(() => {
            if (formData.roll) {
                checkRollAvailability(formData.roll);
            }
        }, 500); // Debounce by 500ms
        
        return () => clearTimeout(timer);
    }, [formData.roll]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        // First check if roll is available
        if (!rollAvailable) {
            alert('This roll number is already registered. Please try logging in or use a different roll number.');
            return;
        }
        
        try {
            // 1. Get the server's public RSA key
            const { data } = await axios.post('http://localhost:5000/publicKey', {}, {
                withCredentials: true
            });
            const serverPublicKey = data.public_key;
            
            // 2. Generate user's RSA key pair
            const { publicKey, privateKey } = generateRSAKeys();
            
            // 3. Generate user's AES key for local storage encryption
            const userAESKey = generateAESKey();
            
            // 4. Set up encryption with server's public key
            const rsaEncrypt = new JSEncrypt();
            rsaEncrypt.setPublicKey(serverPublicKey);
            
            // 5. Encrypt all user data with server's RSA key
            const encryptedData = {
                name: rsaEncrypt.encrypt(formData.name),
                roll: rsaEncrypt.encrypt(formData.roll),
                email: rsaEncrypt.encrypt(formData.email),
                password: rsaEncrypt.encrypt(formData.password),
                publicKey: publicKey, // Send user's public key unencrypted
            };
            
            // 6. Send registration request with updated axios instance
            const response = await instance.post('/register', encryptedData);
            
            if (response.status === 200) {
                // 7. Decrypt the returned server AES key using user's private key
                const decrypt = new JSEncrypt();
                decrypt.setPrivateKey(privateKey);
                const serverAESKey = decrypt.decrypt(response.data.key);
                
                if (!serverAESKey) {
                    throw new Error("Failed to decrypt server AES key");
                }
                
                // Print the received AES key for testing purposes
                console.log('Received AES key from server:', serverAESKey);
                
                // 8. Encrypt private key and user AES key for storage
                const encryptedPrivateKey = encryptWithAES(privateKey, serverAESKey);
                const encryptedUserAESKey = encryptWithAES(userAESKey, serverAESKey);
                
                // 9. Store encrypted keys with user-specific names using roll number
                // This allows multiple users to log in on the same device
                localStorage.setItem(`encryptedPrivateKey_${formData.roll}`, encryptedPrivateKey);
                localStorage.setItem(`encryptedAESKey_${formData.roll}`, encryptedUserAESKey);
                
                // Display the AES key in the UI for testing
                alert(`Registration successful! Server AES key: ${serverAESKey}`);
                
                console.log('Registration successful, navigating to login');
                navigate('/login');
            }
        } catch (error) {
            console.error('Registration error:', error);
            if (error.response && error.response.status === 409) {
                alert('This account already exists. Please try logging in instead.');
            } else if (error.response) {
                // Other server errors
                alert(`Registration failed: ${error.response.data.msg || 'Server error'}`);
            } else if (error.request) {
                // No response from server
                alert('No response from server. Check if the server is running.');
            } else {
                // Other errors
                alert(`Registration failed: ${error.message}`);
            }
        }
    };

    return (
        <div>
            <h2>Register</h2>
            <form onSubmit={handleSubmit}>
                <div>
                    <label>Name:</label>
                    <input type="text" name="name" value={formData.name} onChange={handleChange} required />
                </div>
                <div>
                    <label>Roll:</label>
                    <input 
                        type="text" 
                        name="roll" 
                        value={formData.roll} 
                        onChange={handleChange} 
                        required 
                    />
                    {formData.roll && (
                        <div style={{ 
                            color: rollAvailable ? 'green' : 'red',
                            fontSize: '0.8rem',
                            marginTop: '5px'
                        }}>
                            {checkingRoll 
                                ? 'Checking availability...' 
                                : rollAvailable 
                                    ? 'Roll number is available' 
                                    : 'Roll number is already registered'}
                        </div>
                    )}
                </div>
                <div>
                    <label>Email:</label>
                    <input type="email" name="email" value={formData.email} onChange={handleChange} required />
                </div>
                <div>
                    <label>Password:</label>
                    <input type="password" name="password" value={formData.password} onChange={handleChange} required />
                </div>
                <button 
                    type="submit" 
                    disabled={!rollAvailable || checkingRoll}
                >
                    Register
                </button>
            </form>
        </div>
    );
};

export default Register;
