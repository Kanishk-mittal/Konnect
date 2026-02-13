# College Routes
This Document contains all information regarding college.routes.ts

## Endpoints 
baseURL: `/api/college`

### 1. /otp
Method :- `POST`
Description :- Sends an OTP to the given email address for college registration verification.
input : - 
```json
{
    "emailId": "admin@college.edu"
}
```
controller :- `sendConfirmationOTP`

### 2. /register-college
Method :- `POST`
Description :- Registers a new college and its root admin.
Note :- This request should be encrypted using the security handshake.
input : - 
```json
{
    "collegeName": "Example University",
    "adminUsername": "super_admin",
    "collegeCode": "EXUNI",
    "emailId": "admin@college.edu",
    "password": "securePass123",
    "otp": "123456"
}
```
controller :- `registerCollegeController`
input_validations :- `college.schema.ts`
response :- Sets an `auth_token` cookie and returns the root admin's `recoveryKey` and `privateKey`.
