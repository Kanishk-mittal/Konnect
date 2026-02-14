#
### 2. /create
Method :- `POST`
Description :- Creates a new club and corresponding user account. Only accessible by an authenticated admin. The request should be encrypted using the security handshake.
input : -
```json
{
    "clubName": "Tech Club",
    "email": "techclub@exuni.edu",
    "password": "securePass123"
}
```
controller :- `createClubController`
response :- Returns the created club and user details, including cryptographic keys for secure access.
```json
{
    "status": true,
    "message": "Club created successfully.",
    "data": {
        "id": "65cad...",
        "clubName": "Tech Club",
        "email": "techclub@exuni.edu",
        "userId": "65cad..."
    }
}
```
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

### 3. /delete/:clubId
Method :- `DELETE`
Description :- Deletes a specific club and its corresponding user account. Only accessible by an authenticated admin who belongs to the same college as the club.
input :- `clubId` as a URL parameter.
controller :- `deleteClubController`
response :- Confirms the deletion of the club and its associated user.
```json
{
    "status": true,
    "message": "Club and associated user deleted successfully",
    "data": {
        "deletedClubId": "65cad...",
        "deletedClubName": "Tech Club"
    }
}
```

### 4. /members
Method :- `GET`
Description :- Fetches all members (students) for the authenticated club.
input :- None (Uses authenticated club's credentials).
controller :- `getClubMembersController`
response :- Returns a list of members with their profile and position.
```json
{
    "status": true,
    "data": [
        {
            "id": "65cad...",
            "rollNumber": "21001",
            "name": "John Doe",
            "profilePicture": "https://...",
            "position": "President",
            "isBlocked": false,
            "joinedAt": "2024-02-14T..."
        }
    ]
}
```
