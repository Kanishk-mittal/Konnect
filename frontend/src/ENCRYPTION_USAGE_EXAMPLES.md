# Encrypted API Functions Usage Examples

This document provides examples of how to use the new `postEncryptedData` and `getEncryptedData` functions in the frontend.

## Overview

The new functions in `src/api/requests.ts` provide automatic encryption/decryption for API calls:

- **`postEncryptedData()`** - Encrypts request data and handles encrypted responses
- **`getEncryptedData()`** - Handles encrypted responses for GET requests

## Backend Compatibility

These functions are designed to work with the backend's encryption middleware:

```typescript
// Backend route with encryption middleware
router.post('/login', decryptRequest, controller, resolvePublicKey, encryptResponse);
```

The functions automatically handle:
- ✅ **Server key retrieval** and caching (4-minute cache)
- ✅ **Request encryption** using RSA + AES hybrid encryption
- ✅ **Response decryption** when `expectEncryptedResponse: true`
- ✅ **Client key generation** for encrypted responses
- ✅ **Error handling** for encryption failures

## Function Signatures

```typescript
postEncryptedData(
  endpoint: string, 
  data: any, 
  options?: { 
    expectEncryptedResponse?: boolean;
    clientKeys?: { privateKey: string; publicKey: string };
  }
): Promise<any>

getEncryptedData(
  endpoint: string, 
  params?: any, 
  options?: { 
    expectEncryptedResponse?: boolean;
    clientKeys?: { privateKey: string; publicKey: string };
  }
): Promise<any>
```

## Usage Examples

### 1. Student Login (with encrypted response)

```typescript
import { postEncryptedData } from '../api/requests';

const handleStudentLogin = async (formData: { collegeCode: string; rollNumber: string; password: string; }) => {
  try {
    // Old manual approach (30+ lines of encryption code)
    /*
    const publicKeyResponse = await getData('/encryption/rsa/publicKey');
    const [clientPrivateKey, clientPublicKey] = generateRSAKeyPair();
    const aesKey = generateAESKey();
    const encryptedData = {
      collegeCode: encryptAES(formData.collegeCode, aesKey),
      rollNumber: encryptAES(formData.rollNumber, aesKey),
      password: encryptAES(formData.password, aesKey),
      key: encryptRSA(aesKey, publicKey),
      keyId: keyId,
      publicKey: clientPublicKey
    };
    const response = await postData('/student/login', encryptedData);
    // Manual decryption code...
    */
    
    // New simplified approach (1 line!)
    const response = await postEncryptedData('/student/login', {
      collegeCode: formData.collegeCode,
      rollNumber: formData.rollNumber,
      password: formData.password
    }, { 
      expectEncryptedResponse: true 
    });
    
    console.log('Decrypted response:', response);
    // response = { privateKey: "...", studentId: "..." }
    
  } catch (error) {
    console.error('Login failed:', error);
  }
};
```

### 2. Admin Registration (with encrypted response)

```typescript
import { postEncryptedData } from '../api/requests';

const handleAdminRegistration = async (adminData: {
  collegeName: string;
  emailId: string;
  adminUsername: string;
  password: string;
}) => {
  try {
    const response = await postEncryptedData('/admin/register', adminData, {
      expectEncryptedResponse: true
    });
    
    console.log('Registration successful:', response);
    // response = { recoveryKey: "...", privateKey: "...", id: "..." }
    
  } catch (error) {
    console.error('Registration failed:', error);
  }
};
```

### 3. Bulk Student Registration (encrypted request only)

```typescript
import { postEncryptedData } from '../api/requests';

const handleBulkStudentRegistration = async (students: Array<{
  name: string;
  roll: string;
  email: string;
}>) => {
  try {
    const response = await postEncryptedData('/student/addMultiple', {
      students: students
    });
    
    console.log('Bulk registration result:', response);
    // response = { status: true, registered: 25, failed: 0, details: {...} }
    
  } catch (error) {
    console.error('Bulk registration failed:', error);
  }
};
```

### 4. Get Student Details (no encryption needed)

```typescript
import { getData } from '../api/requests';

const getStudentDetails = async (collegeCode: string) => {
  try {
    // This endpoint doesn't use encryption middleware
    const response = await getData(`/student/details/${collegeCode}`);
    
    console.log('Student details:', response);
    
  } catch (error) {
    console.error('Failed to get student details:', error);
  }
};
```

### 5. Using Custom Client Keys (Advanced)

```typescript
import { postEncryptedData } from '../api/requests';
import { generateRSAKeyPair } from '../encryption/RSA_utils';

const handleLoginWithCustomKeys = async (formData: any) => {
  try {
    // Generate or retrieve existing client keys
    const [clientPrivateKey, clientPublicKey] = generateRSAKeyPair();
    
    const response = await postEncryptedData('/student/login', formData, {
      expectEncryptedResponse: true,
      clientKeys: {
        privateKey: clientPrivateKey,
        publicKey: clientPublicKey
      }
    });
    
    // Save keys for future use
    localStorage.setItem('clientPrivateKey', clientPrivateKey);
    
  } catch (error) {
    console.error('Login failed:', error);
  }
};
```

## Migration from Manual Encryption

### Before (Manual Approach)
```typescript
// 30+ lines of manual encryption in every component
const publicKeyResponse = await getData('/encryption/rsa/publicKey');
const [clientPrivateKey, clientPublicKey] = generateRSAKeyPair();
const aesKey = generateAESKey();
const encryptedData = {
  field1: encryptAES(data.field1, aesKey),
  field2: encryptAES(data.field2, aesKey),
  key: encryptRSA(aesKey, publicKey),
  keyId: keyId,
  publicKey: clientPublicKey
};
const response = await postData('/endpoint', encryptedData);
// Manual response decryption...
```

### After (Automated Approach)
```typescript
// 1 line with automatic encryption/decryption
const response = await postEncryptedData('/endpoint', data, { 
  expectEncryptedResponse: true 
});
```

## Error Handling

The functions include comprehensive error handling:

```typescript
try {
  const response = await postEncryptedData('/endpoint', data);
} catch (error) {
  if (error.message.includes('Unable to establish secure connection')) {
    // Server key retrieval failed
    console.error('Network or server key issue');
  } else if (error.message.includes('Failed to decrypt')) {
    // Response decryption failed
    console.error('Response decryption issue');
  } else {
    // Other API errors
    console.error('API call failed:', error);
  }
}
```

## Performance Features

### Server Key Caching
- ✅ **4-minute cache** for server public keys
- ✅ **Automatic refresh** before server key rotation (5 minutes)
- ✅ **Single key request** shared across multiple API calls

### Automatic Key Management
- ✅ **Client key generation** on-demand
- ✅ **Key reuse** when provided in options
- ✅ **Memory efficient** - no unnecessary key storage

## Security Features

### Request Encryption
- ✅ **RSA + AES hybrid** encryption (same as backend)
- ✅ **Unique AES keys** for each request
- ✅ **Server key validation** with keyId verification

### Response Decryption
- ✅ **Client key pair** generation for secure responses
- ✅ **Automatic detection** of encrypted vs plain responses
- ✅ **Field-level decryption** with fallback for non-encrypted fields

## Backend Compatibility Matrix

| Endpoint | Middleware Chain | Function Usage |
|----------|------------------|----------------|
| `/student/login` | `decryptRequest → controller → resolvePublicKey → encryptResponse` | `postEncryptedData(endpoint, data, { expectEncryptedResponse: true })` |
| `/admin/register` | `decryptRequest → controller → resolvePublicKey → encryptResponse` | `postEncryptedData(endpoint, data, { expectEncryptedResponse: true })` |
| `/student/addMultiple` | `authMiddleware → adminAuthMiddleware → decryptRequest → controller → encryptResponse` | `postEncryptedData(endpoint, data)` |
| `/student/details/:id` | `authMiddleware → controller` | `getData(endpoint)` (no encryption) |

---

**Last Updated:** September 19, 2025  
**API Version:** 2.0
