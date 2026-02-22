# Student Routes
This Document contains all information regarding student.routes.ts

## Endpoints 
baseURL: `/api/student`

### 1. /login
Method :- `POST`
Description :- Authenticates a student and sets a JWT cookie (`auth_token`). The request body must be encrypted.
Note :- Requires middleware to decrypt request and optionally encrypt response.
Input (Decrypted) :- 
```json
{
    "collegeCode": "COLLEGE123",
    "rollNumber": "2021CS101",
    "password": "securePassword",
    "publicKey": "student-generated-rsa-public-key"
}
```
controller :- `studentLoginController`
response (Encrypted if publicKey provided) :- 
```json
{
    "privateKey": "student-private-key-from-db",
    "studentId": "65cad..."
}
```
Standard response (if no publicKey) :-
```json
{
    "status": true,
    "message": "Login successful!"
}
```

### 2. /logout
Method :- `POST`
Description :- Logs out the student by clearing the `auth_token` cookie.
controller :- `studentLogoutController`
response :-
```json
{
    "status": true,
    "message": "Logged out successfully."
}
```

### 3. /list
Method :- `GET`
Description :- Returns details for all students in the same college as the currently authenticated user.
Note :- Requires `auth_token` cookie.
controller :- `getStudentByCollegeCode`
response :-
```json
{
    "status": true,
    "message": "Student details retrieved successfully.",
    "data": [
        {
            "id": "65cad...",
            "rollNumber": "2021CS101",
            "name": "John Doe",
            "profilePicture": "http://...",
            "isBlocked": false
        }
    ]
}
```

### 4. /blocked
Method :- `GET`
Description :- Returns details for all blocked students in the same college as the currently authenticated admin.
Note :- Requires `auth_token` cookie and admin privileges.
controller :- `getBlockedStudentsByCollegeCode`
response :-
```json
{
    "status": true,
    "message": "Blocked student details retrieved successfully.",
    "data": [
        {
            "id": "65cad...",
            "rollNumber": "2021CS101",
            "name": "Jane Doe",
            "profilePicture": "http://...",
            "isBlocked": true,
            "reason": "Violation of community guidelines"
        }
    ]
}
```

### 5. /block-multiple
Method :- `POST`
Description :- Blocks multiple students by adding them to the blocked list with a reason.
Note :- Requires `auth_token` cookie, admin privileges, and decrypted request body.
Input (Decrypted) :- 
```json
{
    "students": [
        {
            "rollNumber": "2021CS101",
            "reason": "Disciplinary Action"
        },
        {
            "rollNumber": "2021CS102",
            "reason": "Spamming"
        }
    ]
}
```
controller :- `blockMultipleStudents`
response :- 
```json
{
    "status": true,
    "message": "Processed 2 requests. Blocked: 2, Failed: 0",
    "data": {
        "blocked": [
            {
                "rollNumber": "2021CS101",
                "studentId": "65cad...",
                "reason": "Disciplinary Action"
            }
        ],
        "failed": []
    }
}
```

### 6. /unblock-multiple
Method :- `POST`
Description :- Unblocks multiple students by removing them from the blocked list.
Note :- Requires `auth_token` cookie, admin privileges, and decrypted request body.
Input (Decrypted) :- 
```json
{
    "rollNumbers": ["2021CS101", "2021CS102"]
}
```
controller :- `unblockMultipleStudents`
response :- 
```json
{
    "status": true,
    "message": "Processed 2 requests. Unblocked: 2, Failed: 0",
    "data": {
        "unblocked": [
            {
                "rollNumber": "2021CS101",
                "studentId": "65cad..."
            }
        ],
        "failed": []
    }
}
```
