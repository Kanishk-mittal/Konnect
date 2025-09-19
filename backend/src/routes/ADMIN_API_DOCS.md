# Admin API Documentation

## Overview

This document describes the admin-related API endpoints for the Konnect application. Admin endpoints handle college administration functionality including registration, login, and profile management.

## Base URL
All admin endpoints are prefixed with `/admin`

## Encrypted Endpoints

The following endpoints use hybrid encryption (RSA + AES) for secure data transmission. See the main ENCRYPTION_API_DOCS.md for detailed encryption format.

### `POST /admin/register`

Register a new admin (college) in the system.

#### Request Format
```
POST /admin/register
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
  "collegeName": "University of Example",
  "adminUsername": "admin_user",
  "collegeCode": "UOEX123",
  "emailId": "admin@example.edu",
  "password": "secure_password123",
  "otp": "123456"
}
```

#### Field Validation
- **collegeName**: 2-100 characters, alphanumeric with spaces
- **adminUsername**: 3-30 characters, alphanumeric and underscores
- **collegeCode**: 6-10 characters, alphanumeric uppercase
- **emailId**: Valid email format
- **password**: Minimum 8 characters with complexity requirements
- **otp**: 6-digit code (must be verified via `/admin/otp`)

#### Response Format

**Success (201):**
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
  "message": "Registration successful! Welcome to Konnect.",
  "data": {
    "recoveryKey": "admin-recovery-key-for-account-recovery",
    "privateKey": "-----BEGIN RSA PRIVATE KEY-----\n...\n-----END RSA PRIVATE KEY-----",
    "id": "admin-database-id"
  }
}
```

**Error (400/409/500):**
```json
{
  "status": false,
  "message": "Error description"
}
```

### `POST /admin/login`

Authenticate an admin user.

#### Request Format
```
POST /admin/login
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
  "username": "admin_user",
  "password": "user_password"
}
```

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
    "id": "admin-database-id",
    "privateKey": "-----BEGIN RSA PRIVATE KEY-----\n...\n-----END RSA PRIVATE KEY-----"
  }
}
```

**Error (400/401/404/500):**
```json
{
  "status": false,
  "message": "Error description"
}
```

## Unencrypted Endpoints

The following endpoints use standard JSON without encryption:

### `POST /admin/otp`

Send OTP email for admin registration.

#### Request Format
```json
{
  "emailId": "admin@example.edu"
}
```

#### Response Format
```json
{
  "status": true,
  "message": "OTP sent successfully. Please check your email."
}
```

### `GET /admin/profile/picture/:adminId`

Get admin profile picture URL.

#### Parameters
- `adminId`: Admin database ID

#### Response Format
```json
{
  "status": true,
  "profilePicture": "https://cloudinary.com/..." // or null
}
```

### `GET /admin/details/:adminId`

Get public admin details.

#### Parameters
- `adminId`: Admin database ID

#### Response Format
```json
{
  "status": true,
  "message": "Admin details retrieved successfully.",
  "data": {
    "username": "admin_user",
    "email": "admin@example.edu",
    "collegeCode": "UOEX123"
  }
}
```

### `GET /admin/details`

Get authenticated admin details from JWT token.

**Authentication Required:** JWT cookie

#### Response Format
```json
{
  "status": true,
  "message": "Admin details retrieved successfully.",
  "data": {
    "userId": "admin-database-id",
    "username": "admin_user", 
    "email": "admin@example.edu",
    "collegeCode": "UOEX123"
  }
}
```

### `GET /admin/userID`

Get authenticated admin user ID.

**Authentication Required:** JWT cookie

#### Response Format
```json
{
  "userId": "admin-database-id"
}
```

### `POST /admin/logout`

Logout admin user (clears JWT cookie).

#### Response Format
```json
{
  "status": true,
  "message": "Logged out successfully."
}
```

## Authentication

### JWT Cookie
- **Name:** `auth_token`
- **HttpOnly:** true
- **SameSite:** lax
- **Secure:** true (production only)
- **Expiry:** 30 days

### Middleware Chain
Encrypted endpoints use this middleware sequence:
1. `decryptRequest` - Decrypt incoming encrypted data
2. `controller` - Business logic
3. `resolvePublicKey` - Determine encryption key for response
4. `encryptResponse` - Encrypt sensitive response data

## Error Codes

- **400:** Bad Request (validation errors, malformed data)
- **401:** Unauthorized (invalid credentials, expired OTP)
- **404:** Not Found (admin doesn't exist)
- **409:** Conflict (duplicate registration)
- **500:** Internal Server Error

## Security Features

- ✅ End-to-end encryption for sensitive data
- ✅ Password hashing with bcrypt
- ✅ JWT-based session management
- ✅ OTP verification for registration
- ✅ Input validation and sanitization
- ✅ Recovery key generation for account recovery

---

**Last Updated:** September 19, 2025  
**API Version:** 2.0