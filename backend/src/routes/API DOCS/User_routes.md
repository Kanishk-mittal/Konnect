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
