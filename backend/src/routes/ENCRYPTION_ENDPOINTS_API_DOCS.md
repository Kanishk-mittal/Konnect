# Encryption Endpoints API Documentation

## Overview

This document describes the encryption-related API endpoints for the Konnect application. These endpoints provide the foundation for secure communication by handling key exchange and encryption utilities.

## Base URL
All encryption endpoints are prefixed with `/encryption`

## Endpoints

### `GET /encryption/rsa/publicKey`

Get the server's current RSA public key for encrypting client requests.

#### Purpose
This is the **bootstrap endpoint** that clients must call first to obtain the server's public key. This key is used to encrypt the AES keys in subsequent encrypted requests.

#### Request Format
```
GET /encryption/rsa/publicKey
```

**No authentication required** - This is a public endpoint.

#### Response Format

**Success (200):**
```json
{
  "status": true,
  "publicKey": "-----BEGIN PUBLIC KEY-----\nMIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA...\n-----END PUBLIC KEY-----",
  "keyId": "key_1647891234_abc123"
}
```

**Error (500):**
```json
{
  "status": false,
  "error": "Public key not available",
  "message": "KeyManager not properly initialized"
}
```

#### Response Fields
- **status**: Boolean indicating success/failure
- **publicKey**: Server's RSA public key in PEM format
- **keyId**: Unique identifier for this key pair (used in encrypted requests)

#### Key Management Features
- ✅ **Automatic Key Rotation**: Keys are automatically rotated every 5+ minutes
- ✅ **Multiple Active Keys**: Server maintains current and past keys for seamless transitions
- ✅ **High Availability**: New key generation doesn't break existing sessions

### `POST /encryption/aes/external-key`

Get the external AES key encrypted with user's public key.

#### Purpose
Provides authenticated users with an encrypted version of the external AES key for specific encryption operations.

#### Authentication
**Required:** JWT cookie (`auth_token`)

#### Request Format
```
POST /encryption/aes/external-key
Content-Type: application/json
Authorization: JWT cookie
```

**Request Body:**
```json
{
  "publicKey": "-----BEGIN PUBLIC KEY-----\nMIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA...\n-----END PUBLIC KEY-----"
}
```

#### Response Format

**Success (200):**
```json
{
  "status": true,
  "aesKey": "base64-encoded-encrypted-aes-key"
}
```

**Error Responses:**

*Missing Public Key (400):*
```json
{
  "status": false,
  "error": "Public key is required"
}
```

*Encryption Error (500):*
```json
{
  "status": false,
  "error": "Failed to encrypt the key",
  "message": "RSA encryption failed"
}
```

*Authentication Error (401):*
```json
{
  "error": "Unauthorized"
}
```

## Integration with Main Encryption System

### Request Encryption Flow
1. **Get Server Key**: Call `GET /encryption/rsa/publicKey`
2. **Store Key Info**: Save `publicKey` and `keyId` for request encryption
3. **Encrypt Requests**: Use this key to encrypt AES keys in requests to other endpoints

### Key Rotation Handling
```javascript
// Example: Handle key rotation gracefully
async function getServerPublicKey() {
  try {
    const response = await fetch('/encryption/rsa/publicKey');
    const { publicKey, keyId } = await response.json();
    
    // Cache the key info
    localStorage.setItem('serverPublicKey', publicKey);
    localStorage.setItem('serverKeyId', keyId);
    
    return { publicKey, keyId };
  } catch (error) {
    console.error('Failed to get server public key:', error);
    throw error;
  }
}

// Use in encrypted requests
async function makeEncryptedRequest(endpoint, payload) {
  let { publicKey, keyId } = getCachedServerKey();
  
  try {
    // Attempt request with cached key
    return await sendEncryptedRequest(endpoint, payload, publicKey, keyId);
  } catch (error) {
    if (error.message.includes('Invalid key ID')) {
      // Key rotated, get new key and retry
      ({ publicKey, keyId } = await getServerPublicKey());
      return await sendEncryptedRequest(endpoint, payload, publicKey, keyId);
    }
    throw error;
  }
}
```

## Security Features

### Public Key Endpoint Security
- ✅ **Public by Design**: RSA public keys are meant to be public
- ✅ **Automatic Rotation**: Keys rotate regularly for security
- ✅ **No Sensitive Data**: Only public information exposed
- ✅ **High Availability**: Multiple keys active simultaneously

### External AES Key Security
- ✅ **Authentication Required**: Only authenticated users can access
- ✅ **User-Specific Encryption**: Each user gets key encrypted with their public key
- ✅ **RSA Encryption**: External AES key protected by RSA encryption
- ✅ **No Key Reuse**: Fresh encryption for each request

## Error Handling

### Common Error Scenarios

**Key Not Found:**
```json
{
  "status": false,
  "error": "Public key not available",
  "message": "KeyManager not properly initialized"
}
```

**Key Rotation in Progress:**
The endpoint handles key rotation transparently. If a key rotation happens during your request, simply retry with the new key.

**Server Restart:**
After server restart, call `/encryption/rsa/publicKey` again to get fresh keys.

## Integration Examples

### Frontend Bootstrap Sequence
```javascript
class EncryptionManager {
  constructor() {
    this.serverPublicKey = null;
    this.serverKeyId = null;
  }

  async initialize() {
    const response = await fetch('/encryption/rsa/publicKey');
    const data = await response.json();
    
    this.serverPublicKey = data.publicKey;
    this.serverKeyId = data.keyId;
    
    console.log('Encryption manager initialized with key:', this.serverKeyId);
  }

  async getExternalAESKey(userPublicKey) {
    const response = await fetch('/encryption/aes/external-key', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ publicKey: userPublicKey })
    });
    
    const data = await response.json();
    return data.aesKey; // Encrypted with user's public key
  }
}

// Usage
const encryptionManager = new EncryptionManager();
await encryptionManager.initialize();
```

### Backend Key Management
```typescript
// Key rotation is handled automatically
KeyManager.initialize(); // On server startup

// Keys rotate every 5+ minutes automatically
// Old keys remain valid for existing sessions
// New requests use new keys seamlessly
```

## API Versioning

- **Current Version**: 2.0
- **Backward Compatibility**: Keys from version 1.x are still supported
- **Migration**: No client-side changes needed for key rotation

---

**Last Updated:** September 19, 2025  
**API Version:** 2.0