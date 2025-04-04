import CryptoJS from 'crypto-js';
import JSEncrypt from 'jsencrypt';


export const decryptWithAES = (encryptedData, key) => {
        try {
            // Decode the base64 string to get encrypted data
            const ciphertext = CryptoJS.enc.Base64.parse(encryptedData);
            
            // Extract IV (first 16 bytes)
            const iv = CryptoJS.lib.WordArray.create(
                ciphertext.words.slice(0, 4),
                16
            );
            
            // Extract actual ciphertext (everything after IV)
            const encryptedMessage = CryptoJS.lib.WordArray.create(
                ciphertext.words.slice(4),
                ciphertext.sigBytes - 16
            );
            
            // Decrypt using AES
            const decrypted = CryptoJS.AES.decrypt(
                { ciphertext: encryptedMessage },
                CryptoJS.enc.Base64.parse(key),
                { iv: iv, mode: CryptoJS.mode.CBC, padding: CryptoJS.pad.Pkcs7 }
            );
            
            return decrypted.toString(CryptoJS.enc.Utf8);
        } catch (error) {
            return 'Error decrypting message';
        }
    };

// Generate RSA key pair
export const generateRSAKeys = () => {
    const crypt = new JSEncrypt({ default_key_size: 2048 });
    crypt.getKey();
    return {
        publicKey: crypt.getPublicKey(),
        privateKey: crypt.getPrivateKey()
    };
};

export const decryptWithRSA = (encryptedData, privateKey) => {
    const crypt = new JSEncrypt();
    crypt.setPrivateKey(privateKey);
    return crypt.decrypt(encryptedData);
}

export const encryptWithRSA = (data, publicKey) => {
    const crypt = new JSEncrypt();
    crypt.setPublicKey(publicKey);
    return crypt.encrypt(data, 'base64');
}

// Encrypt data with AES
export const encryptWithAES = (message, key) => {
        // Decode base64 AES key
        const keyBytes = CryptoJS.enc.Base64.parse(key);

        // Generate a random IV (Initialization Vector)
        const iv = CryptoJS.lib.WordArray.random(16);

        // Encrypt message using AES-CBC
        const encrypted = CryptoJS.AES.encrypt(message, keyBytes, {
            mode: CryptoJS.mode.CBC,
            padding: CryptoJS.pad.Pkcs7,
            iv: iv
        });

        // Combine IV and ciphertext, then encode as base64
        return CryptoJS.enc.Base64.stringify(iv.concat(encrypted.ciphertext));
    };

export const generateAESKey = () => {
    const randomBytes = CryptoJS.lib.WordArray.random(16);
    return CryptoJS.enc.Base64.stringify(randomBytes);
};

