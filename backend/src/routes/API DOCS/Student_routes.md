# Student Routes
This Document contains all information regarding student.routes.ts

## Endpoints 
baseURL: `/api/student`

### 1. /list
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

### 2. /blocked
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

### 3. /addMultiple
Method :- `POST`
Description :- Registers multiple students in bulk under the authenticated admin's college. Validates data, checks for duplicates, and sends registration emails.
Note :- Requires `auth_token` cookie, admin privileges, and decrypted request body. Response is encrypted.
Input (Decrypted) :-
```json
{
    "students": [
        {
            "name": "John Doe",
            "roll": "2021CS101",
            "email": "john@example.com"
        },
        {
            "name": "Jane Doe",
            "roll": "2021CS102",
            "email": "jane@example.com"
        }
    ]
}
```
controller :- `bulkStudentRegistration`
response (Encrypted) :-
```json
{
    "status": true,
    "message": "Bulk registration completed. Registered: 2 students",
    "registered": 2,
    "emailsSent": 2,
    "emailsFailed": 0,
    "errors": []
}
```

### 4. /delete
Method :- `DELETE`
Description :- Deletes a single student by their user ID. Only deletes students belonging to the admin's own college.
Note :- Requires `auth_token` cookie, admin privileges, and decrypted request body.
Input (Decrypted) :-
```json
{
    "studentId": "65cad..."
}
```
controller :- `deleteStudent`
response :-
```json
{
    "status": true,
    "message": "Student John Doe (2021CS101) has been successfully deleted."
}
```

### 5. /delete-multiple
Method :- `DELETE`
Description :- Deletes multiple students by roll numbers. The college code must match the admin's own college.
Note :- Requires `auth_token` cookie, admin privileges, and decrypted request body.
Input (Decrypted) :-
```json
{
    "collegeCode": "CLG001",
    "rollNumbers": ["2021CS101", "2021CS102"]
}
```
controller :- `deleteMultipleStudents`
response :-
```json
{
    "status": true,
    "message": "Successfully removed 2 student(s).",
    "removedCount": 2,
    "notFound": []
}
```

### 6. /toggle-block
Method :- `POST`
Description :- Toggles a student's blocked status. If currently unblocked, blocks them (with an optional reason); if currently blocked, unblocks them.
Note :- Requires `auth_token` cookie, admin privileges, and decrypted request body.
Input (Decrypted) :-
```json
{
    "studentId": "65cad...",
    "reason": "Disciplinary Action"
}
```
Note :- `reason` is optional and only applied when blocking. Defaults to `"Manually blocked by admin"` if omitted.
controller :- `toggleStudentBlockStatus`
response :-
```json
{
    "status": true,
    "message": "Student blocked successfully.",
    "data": {
        "id": "65cad...",
        "isBlocked": true
    }
}
```

### 7. /block-multiple
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

### 8. /unblock-multiple
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
