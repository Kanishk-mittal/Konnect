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
        { "rollNumber": "21001" },
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

### 3. /chat/delete/:groupId
Method :- `DELETE`
Description :- Deletes a specific chat group. The authenticated user must be a member and an admin of the group.
Note :- Requires `auth_token` cookie. No request body needed.
Input :- None (groupId is in the URL path)
controller :- `deleteChatGroupController`
response :-
```json
{
    "status": true,
    "message": "Chat group deleted successfully",
    "data": {
        "id": "65cad...",
        "type": "chat"
    }
}
```

### 4. /announcement/delete/:groupId
Method :- `DELETE`
Description :- Deletes a specific announcement group. The authenticated user must be a member and an admin of the group.
Note :- Requires `auth_token` cookie. No request body needed.
Input :- None (groupId is in the URL path)
controller :- `deleteAnnouncementGroupController`
response :-
```json
{
    "status": true,
    "message": "Announcement group deleted successfully",
    "data": {
        "id": "65cad...",
        "type": "announcement"
    }
}
```