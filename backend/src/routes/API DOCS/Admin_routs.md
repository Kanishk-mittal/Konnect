# Admin Routes
This Document contains all information regarding admin.routes.ts

## Endpoints 
baseURL: `/api/admin`

### 1. /login
Method :- `POST`
Description :- Authenticates an admin and returns session details.
Note :- This request should be encrypted using the security handshake. The `username` field refers to the admin's login ID (email address).
input : - 
```json
{
    "collegeCode": "EXUNI",
    "username": "admin@college.edu",
    "password": "securePass123"
}
```
controller :- `adminLoginController`
response :- Sets an `auth_token` cookie and returns the `privateKey`.

### 2. /userID
Method :- `GET`
Description :- Checks if an admin is authenticated and returns the user's MongoDB `_id` from the JWT token.
Note :- Requires `authMiddleware` and `adminAuthMiddleware`.
controller :- Inline handler in routes
response :-
```json
{
    "userId": "65cad..."
}
```

### 3. /logout
Method :- `POST`
Description :- Clears the `auth_token` cookie to log out the admin session.
controller :- `adminLogoutController`
response :-
```json
{
    "status": true,
    "message": "Logged out successfully."
}
```



