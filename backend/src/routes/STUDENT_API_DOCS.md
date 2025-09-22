# Student API Documentation

## Overview

This document describes the student-related API endpoints for the Konnect application. These endpoints handle student authentication, profile management, and bulk registration operations.

## Base URL
All student endpoints are prefixed with `/student`

## Endpoints

### `POST /student/login`

Authenticate a student using college code, roll number, and password.

#### Purpose
Primary authentication endpoint for students. Returns encrypted student credentials and JWT token upon successful login.

#### Middleware Chain
```
decryptRequest → studentLoginController → resolvePublicKey → encryptResponse
```

#### Request Format
```
POST /student/login
Content-Type: application/json
```

**Encrypted Request Body:**
```json
{
  "key": "base64-encrypted-aes-key",
  "keyId": "server-key-identifier",
  "collegeCode": "aes-encrypted-college-code",
  "rollNumber": "aes-encrypted-roll-number", 
  "password": "aes-encrypted-password",
  "publicKey": "-----BEGIN PUBLIC KEY-----\nstudent-rsa-public-key\n-----END PUBLIC KEY-----"
}
```

**Decrypted Payload (handled by middleware):**
```json
{
  "collegeCode": "ABC123",
  "rollNumber": "21CS001", 
  "password": "studentPassword123",
  "publicKey": "-----BEGIN PUBLIC KEY-----\nstudent-rsa-public-key\n-----END PUBLIC KEY-----"
}
```

#### Response Format

**Success (200) - Encrypted:**
```json
{
  "key": "base64-encrypted-response-aes-key",
  "keyId": "server-key-identifier",
  "privateKey": "aes-encrypted-student-private-key",
  "studentId": "aes-encrypted-student-id"
}
```

**Decrypted Response Data:**
```json
{
  "privateKey": "-----BEGIN PRIVATE KEY-----\nstudent-rsa-private-key\n-----END PRIVATE KEY-----",
  "studentId": "64f8b2c1a4b6d8e9f0123456"
}
```

**Error Responses:**

*Invalid College Code (404):*
```json
{
  "status": false,
  "error": "Student not found",
  "message": "No student found with the provided college code and roll number"
}
```

*Invalid Password (401):*
```json
{
  "status": false, 
  "error": "Invalid password",
  "message": "The provided password is incorrect"
}
```

*Missing Fields (400):*
```json
{
  "status": false,
  "error": "Missing required fields",
  "message": "College code, roll number, and password are required"
}
```

#### Security Features
- ✅ **End-to-End Encryption**: Request and response fully encrypted
- ✅ **Password Hashing**: Passwords stored using secure hashing
- ✅ **JWT Cookie**: 30-day authentication token set
- ✅ **RSA Key Exchange**: Student's RSA keys securely delivered
- ✅ **Private Key Protection**: Student private key encrypted with password-derived AES

---

### `GET /student/details/:collegeCode`

Get student details by college code.

#### Purpose
Retrieve student profile information for authenticated users.

#### Authentication
**Required:** JWT cookie (`auth_token`)

#### Request Format
```
GET /student/details/ABC123_21CS001
Authorization: JWT cookie
```

#### Response Format

**Success (200):**
```json
{
  "status": true,
  "student": {
    "_id": "64f8b2c1a4b6d8e9f0123456",
    "name": "John Doe",
    "collegeCode": "ABC123_21CS001", 
    "email": "john.doe@college.edu",
    "rollNumber": "21CS001",
    "publicKey": "encrypted-public-key",
    "createdAt": "2023-09-15T10:30:00Z",
    "updatedAt": "2023-09-15T10:30:00Z"
  }
}
```

**Error Responses:**

*Student Not Found (404):*
```json
{
  "status": false,
  "error": "Student not found",
  "message": "No student found with college code: ABC123_21CS001"
}
```

*Unauthorized (401):*
```json
{
  "error": "Unauthorized"
}
```

#### Security Features
- ✅ **Authentication Required**: Only authenticated users can access
- ✅ **Data Protection**: Public keys stored encrypted
- ✅ **Access Control**: Users can only access their own data

---

### `POST /student/addMultiple`

Bulk registration of multiple students (Admin only).

#### Purpose
Register multiple students in batch operations with automatic credential generation and email notifications.

#### Authentication
**Required:** JWT cookie (`auth_token`) + Admin privileges

#### Middleware Chain
```
authMiddleware → adminAuthMiddleware → decryptRequest → bulkStudentRegistration → encryptResponse
```

#### Request Format
```
POST /student/addMultiple
Content-Type: application/json
Authorization: JWT cookie (Admin)
```

**Encrypted Request Body:**
```json
{
  "key": "base64-encrypted-aes-key",
  "keyId": "server-key-identifier", 
  "data": "aes-encrypted-student-data"
}
```

**Decrypted Payload:**
```json
{
  "students": [
    {
      "name": "John Doe",
      "roll": "21CS001", 
      "email": "john.doe@college.edu"
    },
    {
      "name": "Jane Smith",
      "roll": "21CS002",
      "email": "jane.smith@college.edu" 
    }
  ]
}
```

#### Response Format

**Success (200):**
```json
{
  "status": true,
  "message": "Students registered successfully",
  "registered": 25,
  "failed": 0,
  "details": {
    "successful": [
      {
        "name": "John Doe",
        "collegeCode": "ABC123_21CS001",
        "email": "john.doe@college.edu",
        "password": "generated-password"
      }
    ],
    "failed": []
  }
}
```

**Partial Success (200):**
```json
{
  "status": true,
  "message": "Bulk registration completed with some failures", 
  "registered": 23,
  "failed": 2,
  "details": {
    "successful": [...],
    "failed": [
      {
        "name": "Duplicate Student",
        "roll": "21CS999",
        "error": "Student already exists"
      }
    ]
  }
}
```

**Error Responses:**

*Missing Admin Privileges (403):*
```json
{
  "error": "Admin access required"
}
```

*Invalid Data Format (400):*
```json
{
  "status": false,
  "error": "Invalid data format",
  "message": "Students array is required"
}
```

*Unauthorized (401):*
```json
{
  "error": "Unauthorized"
}
```

#### Bulk Registration Features
- ✅ **Automatic Password Generation**: Secure random passwords for each student
- ✅ **RSA Key Pair Generation**: Individual key pairs for each student
- ✅ **Email Notifications**: Automated credential emails sent to all students
- ✅ **Duplicate Handling**: Existing students skipped safely
- ✅ **Batch Processing**: Efficient database operations
- ✅ **Error Reporting**: Detailed success/failure breakdown
- ✅ **Smart Email Queue**: Optimized email delivery system

#### Email Template
Students receive welcome emails containing:
- **College Code**: For login identification
- **Password**: Generated secure password
- **Login Instructions**: How to access the system
- **Security Guidelines**: Best practices for account security

## Data Models

### Student Schema
```typescript
{
  _id: ObjectId,
  name: string,
  collegeCode: string,        // Format: "COLLEGE_ROLLNUMBER"
  email: string,
  rollNumber: string,
  password: string,           // Hashed with bcrypt
  publicKey: string,          // Encrypted with internal AES key
  privateKey: string,         // Not stored (given to student encrypted)
  createdAt: Date,
  updatedAt: Date
}
```

### College Code Format
- **Pattern**: `{CollegePrefix}_{RollNumber}`
- **Examples**: 
  - `ABC123_21CS001` (ABC123 college, Roll: 21CS001)
  - `XYZ456_20ME042` (XYZ456 college, Roll: 20ME042)

## Security Architecture

### Authentication Flow
1. **Student Login**: Encrypted credentials verification
2. **JWT Generation**: 30-day authentication token
3. **Key Exchange**: Student receives encrypted private key
4. **Session Management**: Persistent login via cookie

### Encryption Standards
- **Request Encryption**: RSA + AES hybrid encryption
- **Response Encryption**: AES encrypted with student's public key
- **Key Storage**: Public keys encrypted with internal AES
- **Password Security**: bcrypt hashing with salt rounds

### Access Control
- **Student Endpoints**: JWT authentication required
- **Admin Operations**: Additional admin privilege verification
- **Data Isolation**: Students can only access their own data

## Integration Examples

### Frontend Student Login
```javascript
async function loginStudent(collegeCode, rollNumber, password, userKeys) {
  // Get server public key
  const serverKey = await getServerPublicKey();
  
  // Encrypt login data
  const encryptedPayload = await encryptLoginData({
    collegeCode,
    rollNumber, 
    password,
    publicKey: userKeys.publicKey
  }, serverKey);
  
  // Send login request
  const response = await fetch('/student/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(encryptedPayload)
  });
  
  // Decrypt response
  const encryptedResponse = await response.json();
  const studentData = await decryptResponse(encryptedResponse, userKeys.privateKey);
  
  return studentData; // { privateKey, studentId }
}
```

### Admin Bulk Registration
```javascript
async function bulkRegisterStudents(studentsArray) {
  const encryptedPayload = await encryptBulkData({
    students: studentsArray
  });
  
  const response = await fetch('/student/addMultiple', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(encryptedPayload),
    credentials: 'include' // Include JWT cookie
  });
  
  return await response.json();
}
```

## Error Handling

### Common Error Scenarios
- **Invalid Credentials**: Wrong college code, roll number, or password
- **Duplicate Registration**: Student already exists in bulk operations
- **Missing Authentication**: JWT token expired or missing
- **Access Denied**: Non-admin trying to access admin endpoints
- **Encryption Errors**: Invalid key IDs or malformed encrypted data

### Retry Logic
For encryption-related errors (key rotation), implement retry with updated server keys:

```javascript
async function makeStudentRequest(endpoint, data, maxRetries = 1) {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await sendEncryptedRequest(endpoint, data);
    } catch (error) {
      if (error.message.includes('Invalid key') && attempt < maxRetries) {
        // Refresh server keys and retry
        await refreshServerKeys();
        continue;
      }
      throw error;
    }
  }
}
```

### `GET /student/details/:collegeCode`

Retrieve a list of all students for the given college code.

#### Purpose
Get information about all students in a college. Used by admin dashboard to display student list.

#### Middleware Chain
```
authMiddleware → getStudentByCollegeCode
```

#### Request Format
```
GET /student/details/:collegeCode
Authorization: Bearer <jwt-token>
```

#### Response Format
```json
{
  "status": true,
  "message": "Student details retrieved successfully.",
  "data": [
    {
      "id": "64f8b2c1a4b6d8e9f0123456",
      "rollNumber": "CSE001",
      "name": "John Doe",
      "profilePicture": "https://example.com/profile.jpg",
      "isBlocked": false
    },
    {
      "id": "64f8b2c1a4b6d8e9f0123457",
      "rollNumber": "CSE002",
      "name": "Jane Smith",
      "profilePicture": null,
      "isBlocked": true
    }
  ]
}
```

### `GET /student/blocked/:collegeCode`

Retrieve a list of all blocked students for the given college code.

#### Purpose
Get information about blocked students in a college. Used by admin dashboard to display blocked student list.

#### Middleware Chain
```
authMiddleware → getBlockedStudentsByCollegeCode
```

#### Request Format
```
GET /student/blocked/:collegeCode
Authorization: Bearer <jwt-token>
```

#### Response Format
```json
{
  "status": true,
  "message": "Blocked student details retrieved successfully.",
  "data": [
    {
      "id": "64f8b2c1a4b6d8e9f0123457",
      "rollNumber": "CSE002",
      "name": "Jane Smith",
      "profilePicture": null,
      "isBlocked": true
    }
  ]
}
```

### `POST /student/toggle-block`

Toggle the blocked status of a student.

#### Purpose
Block or unblock a student. Used by admins to control student access to the platform.

#### Middleware Chain
```
authMiddleware → adminAuthMiddleware → decryptRequest → toggleStudentBlockStatus
```

#### Request Format
```
POST /student/toggle-block
Content-Type: application/json
Authorization: Bearer <jwt-token>
```

**Encrypted Request Body:**
```json
{
  "key": "base64-encrypted-aes-key",
  "keyId": "server-key-identifier",
  "studentId": "aes-encrypted-student-id"
}
```

#### Response Format
```json
{
  "status": true,
  "message": "Student blocked successfully.",
  "data": {
    "id": "64f8b2c1a4b6d8e9f0123457",
    "isBlocked": true
  }
}
```

or

```json
{
  "status": true,
  "message": "Student unblocked successfully.",
  "data": {
    "id": "64f8b2c1a4b6d8e9f0123457",
    "isBlocked": false
  }
}
```

---

**Last Updated:** September 19, 2025  
**API Version:** 2.0