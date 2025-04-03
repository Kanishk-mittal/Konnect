import CryptoJS from 'crypto-js';
import JSEncrypt from 'jsencrypt';


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

const decryptWithRSA = (encryptedData, privateKey) => {
    const crypt = new JSEncrypt();
    crypt.setPrivateKey(privateKey);
    return crypt.decrypt(encryptedData);
}

const encryptWithRSA = (data, publicKey) => {
    const crypt = new JSEncrypt();
    crypt.setPublicKey(publicKey);
    return crypt.encrypt(data, 'base64');
}

// Encrypt data with AES
const encryptWithAES = (data, key) => {
    if (!data) return null;
    try {
        // Generate a random IV
        const iv = CryptoJS.lib.WordArray.random(16);

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
        return null;
    }
};

const generateAESKey = () => {
    const randomBytes = CryptoJS.lib.WordArray.random(16);
    return CryptoJS.enc.Base64.stringify(randomBytes);
};