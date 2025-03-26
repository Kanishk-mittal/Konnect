import { useState, useContext } from 'react'
import axios from 'axios'
import JSEncrypt from "jsencrypt";
import CryptoJS from 'crypto-js'; 
import { AppContext } from '../context/AppContext';
import { useNavigate } from 'react-router-dom';

function Login() {
    const [roll, setroll] = useState('')
    const [password, setPassword] = useState('')
    const navigate = useNavigate();
    const { setPrivateKey, setDbKey } = useContext(AppContext);

    const instance = axios.create({
        withCredentials: true,
        baseURL: "http://localhost:5000",
        mode: 'cors',
        headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'X-Requested-With': 'XMLHttpRequest',
        }
    })
    const generateRSAKeys = () => {
        const crypt = new JSEncrypt({ default_key_size: 2048 }); // 2048-bit key
        crypt.getKey(); // Generates the key pair

        const publicKey = crypt.getPublicKey();
        const privateKey = crypt.getPrivateKey();

        return { publicKey, privateKey };
    };

    const logOut = async () => {
        try {
            // Extract CSRF token from cookies
            const csrfToken = document.cookie
                .split('; ')
                .find(row => row.startsWith('csrf_access_token='))
                ?.split('=')[1];

            if (!csrfToken) {
                console.error("CSRF token not found");
                return;
            }

            // Include CSRF token in the request headers
            const response = await instance.post('/logout', {}, {
                headers: {
                    "X-CSRF-TOKEN": csrfToken
                }
            });
            console.log(response.data);
            alert("Logged out successfully!");
            
            // Optionally, you might want to clear any user-related state or redirect
            setPrivateKey(null);
            setDbKey(null);
            navigate('/'); // Redirect to home or login page
        } catch (error) {
            console.error("Logout error:", error.response?.data || error.message);
            alert("Logout failed. Please try again.");
        }
    }

    const handleLogin = async () => {
        try {
            // getting RSA public key
            const { data } = await axios.post('http://localhost:5000/publicKey')
            const publicKeyPem = data.public_key
            const key = new JSEncrypt();
            key.setPublicKey(publicKeyPem);
            const encryptedRoll = key.encrypt(roll, 'base64');
            const encryptedPassword = key.encrypt(password, 'base64');
            const { publicKey, privateKey } = generateRSAKeys()
            
            const response = await instance.post('/login', {
                roll: encryptedRoll,
                password: encryptedPassword,
                publicKey: publicKey // Fixed the typo from pyblicKey to publicKey
            })
            
            const crypt = new JSEncrypt();
            crypt.setPrivateKey(privateKey);
            const serverAESKey = crypt.decrypt(response.data.key);
            
            console.log('Received AES key from server:', serverAESKey);
            
            // Look for user-specific keys using roll number
            console.log("Searching for stored keys for roll:", roll);
            
            // Try to get and decrypt the user's specific keys
            const encryptedPrivateKey = localStorage.getItem(`encryptedPrivateKey_${roll}`);
            const encryptedAESKey = localStorage.getItem(`encryptedAESKey_${roll}`);
            
            let foundKeys = false;
            
            if (encryptedPrivateKey && encryptedAESKey) {
                try {
                    // Decrypt the private key
                    const decryptedPrivateKey = decryptWithAES(encryptedPrivateKey, serverAESKey);
                    if (decryptedPrivateKey && decryptedPrivateKey.includes("-----BEGIN RSA PRIVATE KEY-----")) {
                        console.log("Found private key for user:", roll);
                        setPrivateKey(decryptedPrivateKey);
                        
                        // Decrypt the AES key
                        const decryptedAESKey = decryptWithAES(encryptedAESKey, serverAESKey);
                        if (decryptedAESKey) {
                            console.log("Found AES DB key for user:", roll);
                            setDbKey(decryptedAESKey);
                            foundKeys = true;
                        }
                    }
                } catch (error) {
                    console.error("Error decrypting keys:", error);
                }
            }
            
            // Fall back to searching all keys if user-specific keys are not found
            if (!foundKeys) {
                console.log("No user-specific keys found, searching all localStorage...");
                for (let i = 0; i < localStorage.length; i++) {
                    const key = localStorage.key(i);
                    const value = localStorage.getItem(key);
                    
                    try {
                        // Try to decrypt each stored value with the server AES key
                        const decrypted = decryptWithAES(value, serverAESKey);
                        
                        // If it starts with proper PEM format for private key or looks like a valid base64 string for AES key
                        if (decrypted && decrypted.includes("-----BEGIN RSA PRIVATE KEY-----")) {
                            console.log("Found private key");
                            setPrivateKey(decrypted);
                            foundKeys = true;
                        } else if (decrypted && /^[A-Za-z0-9+/=]+$/.test(decrypted) && decrypted.length >= 20) {
                            // This is likely our AES key (base64 format)
                            console.log("Found AES DB key");
                            setDbKey(decrypted);
                            foundKeys = true;
                        }
                    } catch (error) {
                        // Not the right key, continue searching
                        continue;
                    }
                }
            }
            
            if (foundKeys) {
                console.log("Successfully retrieved keys!");
                alert("Login successful!");
                navigate('/test'); // Redirect to test page or dashboard
            } else {
                // If we can't find the stored keys, this might be the first login after registration
                alert("Could not find your stored keys. Please register first.");
            }
            
        } catch (error) {
            console.error('Login error:', error);
            alert(`Login failed: ${error.response?.data?.msg || error.message}`);
        }
    }

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
            console.error('Decryption failed:', error);
            return null;
        }
    }
    
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
    }

    return (
        <>
            <div>
            </div>
            <h1>Vite + React</h1>
            <div className="card">
                <form onSubmit={(e) => { e.preventDefault(); handleLogin(); }}>
                    <div>
                        <label>
                            roll:
                            <input
                                type="text"
                                value={roll}
                                onChange={(e) => setroll(e.target.value)}
                            />
                        </label>
                    </div>
                    <div>
                        <label>
                            Password:
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                            />
                        </label>
                    </div>
                    <button type="submit">Login</button>
                </form>
                <button onClick={logOut}>Logout</button>
            </div>
        </>
    )
}

export default Login
