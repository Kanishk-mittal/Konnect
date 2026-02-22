# User Routes
This Document contains all information regarding user.routes.ts

## Endpoints 
baseURL: `/api/user`

### 1. /profile-picture/:userId
Method :- `GET`
Description :- Returns the profile picture URL for a specific user.
Parameters :- 
* `userId`: The MongoDB `_id` of the user.
controller :- `getUserProfilePicture`
response :- 
```json
{
    "status": true,
    "profilePicture": "http://cloudinary.com/..."
}
```

### 2. /profile-picture
Method :- `POST`
Description :- Updates the profile picture for the currently authenticated user.
Note :- Requires `auth_token` cookie. Expects multipart/form-data.
Input :- `image` (File)
controller :- `updateProfilePicture`
response :-
```json
{
    "status": true,
    "message": "Profile picture updated successfully.",
    "data": {
        "profilePicture": "http://cloudinary.com/..."
    }
}
```

### 3. /details/:userId
Method :- `GET`
Description :- Returns public details for a specific user.
Parameters :-
* `userId`: The MongoDB `_id` of the user.
controller :- `getUserDetails`
response :-
```json
{
    "status": true,
    "message": "User details retrieved successfully.",
    "data": {
        "username": "JohnDoe",
        "email": "john@example.com",
        "collegeCode": "EXUNI",
        "userType": "student"
    }
}
```

### 4. /details
Method :- `GET`
Description :- Returns details for the currently authenticated user.
Note :- Requires `auth_token` cookie.
controller :- `getMyDetails`
response :-
```json
{
    "status": true,
    "message": "User details retrieved successfully.",
    "data": {
        "userId": "65cad...",
        "username": "JohnDoe",
        "email": "john@example.com",
        "collegeCode": "EXUNI",
        "userType": "student"
    }
}
```

### 5. /password/request-otp
Method :- `GET`
Description :- Requests an OTP for password change. The OTP is sent to the user's primary email address.
Note :- Requires `auth_token` cookie.
controller :- `requestPasswordChangeOTP`
response :- 
```json
{
    "status": true,
    "message": "OTP sent successfully to your registered email."
}
```

### 6. /password/change
Method :- `POST`
Description :- Changes the user's password after verifying the OTP.
Note :- Requires `auth_token` cookie. The request should be encrypted.
Input :-
```json
{
    "previousPassword": "oldPassword123",
    "newPassword": "newSecurePassword123!",
    "otp": "123456"
}
```
Note :- `newPassword` must be at least 12 characters long and contain at least one uppercase letter, one lowercase letter, one number, and one special character.
controller :- `changePasswordWithOTP`
response :-
```json
{
    "status": true,
    "message": "Password changed successfully.",
    "data": {
        "recoveryKey": "new-base64-recovery-key-..."
    }
}
```

### 7. /login
Method :- `POST`
Description :- Authenticates a user (Student, Club, Admin, or Faculty).
Note :- The request body must be encrypted. Returns JWT `auth_token` cookie and encrypted credentials.
Input :-
```json
{
    "id": "rollNumber_or_email",
    "password": "userPassword",
    "collegeCode": "COLLEGE_CODE"
}
```
controller :- `loginUser`
response :- 
```json
{
    "status": true,
    "message": "Login successful!",
    "data": {
        "id": "65cad...",
        "userType": "student",
        "username": "JohnDoe",
        "email": "john@example.com",
        "privateKey": "decrypted_private_key_pem..."
    }
}
```

### 8. /logout
Method :- `POST`
Description :- Logs out the current user by clearing the `auth_token` cookie.
controller :- `logoutUser`
response :-
```json
{
    "status": true,
    "message": "Logout successful."
}
```
