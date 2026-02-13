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



