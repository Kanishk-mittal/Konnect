# Group Routes
This Document contains information regarding groups.routes.ts

## Endpoints 
baseURL: `/api/groups`

### 1. /
Method :- `GET`
Description :- Returns all chat and announcement groups created by the currently authenticated user.
Note :- Requires `auth_token` cookie.
controller :- `getUserGroupsController`
response :- 
```json
{
    "status": true,
    "message": "User groups fetched successfully",
    "data": [
        {
            "id": "65cad...",
            "name": "Social Club",
            "description": "A group for social activities",
            "icon": "http://cloudinary.com/...",
            "type": "chat",
            "memberCount": 10,
            "createdAt": "2024-02-15T..."
        },
        {
            "id": "65cad...",
            "name": "Exam Updates",
            "description": "Official exam announcements",
            "icon": null,
            "type": "announcement",
            "memberCount": 150,
            "createdAt": "2024-02-15T..."
        }
    ]
}
```

### 2. /create
Method :- `POST`
Description :- Creates one or more groups (Chat and/or Announcement). Supports optional image upload for the group icon.
Note :- Requires `auth_token` cookie. The JSON payload must be encrypted using the security handshake.
Input :- 
* `image` (File, Optional) - Sent as multipart/form-data.
* `JSON Payload` (Encrypted):
```json
{
    "groupName": "Tech Enthusiasts",
    "description": "A group for tech lovers",
    "admins": ["21001", "21002"],
    "members": [
        { "rollNumber": "21001", "name": "John Doe" },
        { "rollNumber": "21003" }
    ],
    "isAnnouncementGroup": false,
    "isChatGroup": true
}
```
controller :- `createGroupController`
response :-
```json
{
    "status": true,
    "message": "Group created successfully",
    "data": {
        "created": [
            {
                "id": "65cad...",
                "type": "chat",
                "name": "Tech Enthusiasts",
                "description": "A group for tech lovers",
                "icon": "http://cloudinary.com/...",
                "createdAt": "2024-02-15T...",
                "membersAdded": 2
            }
        ],
        "image": {
            "localPath": "uploads/groups/...",
            "cloudUrl": "http://cloudinary.com/..."
        },
        "createdBy": "65cad..."
    }
}
```

### 3. /delete/:groupId
Method :- `DELETE`
Description :- Deletes a specific group (Chat, Announcement, or both). Accessible by college admins or group admins.
Note :- Requires `auth_token` cookie. The request body (containing groupType) must be encrypted.
Input :-
```json
{
    "groupType": "chat"
}
```
Note :- `groupType` can be `"chat"`, `"announcement"`, or `"both"`.
controller :- `deleteGroupController`
response :-
```json
{
    "status": true,
    "message": "chat group(s) deleted successfully",
    "data": {
        "deletedTypes": ["chat"]
    }
}
```
```