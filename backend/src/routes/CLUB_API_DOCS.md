# Club API Documentation

## Overview

This document describes the club-related API endpoints for the Konnect application. Club endpoints handle club/organization functionality including login and management.

## Base URL
All club endpoints are prefixed with `/club`

## Encrypted Endpoints

The following endpoints use hybrid encryption (RSA + AES) for secure data transmission. See the main ENCRYPTION_API_DOCS.md for detailed encryption format.

### `POST /club/login`

Authenticate a club/organization.

#### Request Format
```
POST /club/login
Content-Type: application/json
```

**Encrypted Request Body:**
```json
{
  "key": "base64-encrypted-aes-key",
  "keyId": "server-key-id",
  "data": "base64-encrypted-payload",
  "publicKey": "client-public-key-pem"
}
```

**Decrypted Payload:**
```json
{
  "collegeCode": "UOEX123",
  "clubName": "Computer Science Club",
  "password": "club_password123"
}
```

#### Field Requirements
- **collegeCode**: College identifier (6-10 characters)
- **clubName**: Name of the club/organization
- **password**: Club's secure password

#### Response Format

**Success (200):**
```json
{
  "data": "base64-encrypted-response",
  "key": "base64-encrypted-aes-key"
}
```

**Decrypted Success Response:**
```json
{
  "status": true,
  "message": "Login successful!",
  "data": {
    "privateKey": "-----BEGIN RSA PRIVATE KEY-----\n...\n-----END RSA PRIVATE KEY-----",
    "id": "club-database-id"
  }
}
```

**Error Response (400/401/404/500):**
```json
{
  "status": false,
  "message": "Error description"
}
```

#### Possible Error Messages
- "College code, club name, and password are required."
- "Club not found."
- "Invalid password."
- "An unexpected error occurred."

## Database Schema

### Club Model
```typescript
{
  Club_name: string,           // Club name
  college_code: string,        // College identifier
  email: string,              // Club contact email
  password_hash: string,      // Hashed password
  recovery_password: string,  // Encrypted recovery data
  private_key: string,        // RSA private key (encrypted)
  public_key: string         // RSA public key (encrypted)
}
```

## Authentication

### JWT Cookie
After successful login, a JWT cookie is set:
- **Name:** `auth_token`
- **HttpOnly:** true
- **SameSite:** lax
- **Secure:** true (production only)
- **Expiry:** 30 days

### JWT Payload
```json
{
  "type": "club",
  "id": "club-database-id",
  "iat": 1234567890,
  "exp": 1234567890
}
```

## Middleware Chain

The login endpoint uses this middleware sequence:
1. `decryptRequest` - Decrypt incoming encrypted data
2. `clubLoginController` - Business logic and validation
3. `resolvePublicKey` - Determine encryption key for response
4. `encryptResponse` - Encrypt sensitive response data

## Implementation Example

### Frontend JavaScript Example

```javascript
// 1. Get server's public key
const serverKeyResponse = await fetch('/encryption/rsa/publicKey');
const { publicKey: serverPublicKey, keyId } = await serverKeyResponse.json();

// 2. Generate client RSA key pair (for response encryption)
const clientKeyPair = generateRSAKeyPair();

// 3. Prepare login payload
const loginPayload = {
  collegeCode: "UOEX123",
  clubName: "Computer Science Club",
  password: "club_password123"
};

// 4. Encrypt the request
const aesKey = generateAESKey();
const encryptedPayload = encryptAES(JSON.stringify(loginPayload), aesKey);
const encryptedAESKey = encryptRSA(aesKey, serverPublicKey);

// 5. Send encrypted request
const response = await fetch('/club/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    key: encryptedAESKey,
    keyId: keyId,
    data: encryptedPayload,
    publicKey: clientKeyPair.publicKey
  })
});

// 6. Decrypt response
const encryptedResponse = await response.json();
if (encryptedResponse.data && encryptedResponse.key) {
  const responseAESKey = decryptRSA(encryptedResponse.key, clientKeyPair.privateKey);
  const decryptedResponse = decryptAES(encryptedResponse.data, responseAESKey);
  const loginData = JSON.parse(decryptedResponse);
  
  // Store club private key and ID for future use
  localStorage.setItem('clubPrivateKey', loginData.data.privateKey);
  localStorage.setItem('clubId', loginData.data.id);
}
```

## Error Codes

- **400:** Bad Request (missing required fields, invalid format)
- **401:** Unauthorized (invalid password)
- **404:** Not Found (club not found)
- **500:** Internal Server Error

## Security Features

- ✅ End-to-end encryption for sensitive data (private keys, passwords)
- ✅ Password hashing with bcrypt
- ✅ JWT-based session management
- ✅ RSA private key encryption in database
- ✅ Input validation and sanitization
- ✅ Automatic response encryption for authenticated sessions

## Notes

### Current Limitations
- Only login endpoint is currently implemented
- Club registration is not yet available via API
- Profile management endpoints not implemented

### Future Endpoints (Planned)
- `POST /club/register` - Club registration
- `GET /club/profile` - Get club profile information
- `PUT /club/profile` - Update club profile
- `POST /club/logout` - Club logout

---

**Last Updated:** September 19, 2025  
**API Version:** 2.0