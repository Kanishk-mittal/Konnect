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
