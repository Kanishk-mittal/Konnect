# Club Routes
This Document contains all information regarding club.routes.ts

## Endpoints 
baseURL: `/api/club`

### 1. /login
Method :- `POST`
Description :- Authenticates a club and returns session details.
Note :- This request should be encrypted using the security handshake. The `clubName` field refers to the club's login identifier.
input : - 
```json
{
    "collegeCode": "EXUNI",
    "clubName": "Tech Club",
    "password": "securePass123"
}
```
controller :- `clubLoginController`
response :- Sets an `auth_token` cookie and returns the `privateKey`.
```json
{
    "status": true,
    "message": "Login successful!",
    "data": {
        "id": "65cad...",
        "privateKey": "base64_encoded_private_key"
    }
}
```
