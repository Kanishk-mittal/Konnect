# Group Routes
This Document contains information regarding groups.routes.ts

## Endpoints 
baseURL: `/api/groups`

### 1. /
Method :- `GET`
Description :- Returns all chat and announcement groups the currently authenticated user is a member of.
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
            "isAdmin": true,
            "createdAt": "2024-02-15T..."
        },
        {
            "id": "65cad...",
            "name": "Exam Updates",
            "description": "Official exam announcements",
            "icon": null,
            "type": "announcement",
            "memberCount": 150,
            "isAdmin": false,
            "createdAt": "2024-02-15T..."
        }
    ]
}
```

### 2. /member-of/chat
Method :- `GET`
Description :- Returns all chat groups the currently authenticated user is a member of.
Note :- Requires `auth_token` cookie.
controller :- `getMemberChatGroupsController`
response :-
```json
{
    "status": true,
    "message": "Chat groups fetched successfully",
    "data": [
        {
            "id": "65cad...",
            "name": "Social Club",
            "description": "A group for social activities",
            "icon": "http://cloudinary.com/...",
            "type": "chat",
            "memberCount": 10,
            "isAdmin": true,
            "createdAt": "2024-02-15T..."
        }
    ]
}
```

### 3. /member-of/announcement
Method :- `GET`
Description :- Returns all announcement groups the currently authenticated user is a member of.
Note :- Requires `auth_token` cookie.
controller :- `getMemberAnnouncementGroupsController`
response :-
```json
{
    "status": true,
    "message": "Announcement groups fetched successfully",
    "data": [
        {
            "id": "65cad...",
            "name": "Exam Updates",
            "description": "Official exam announcements",
            "icon": null,
            "type": "announcement",
            "memberCount": 150,
            "isAdmin": false,
            "createdAt": "2024-02-15T..."
        }
    ]
}
```

### 4. /chat/info/:groupId
Method :- `GET`
Description :- Fetches detailed information about a specific chat group, including a list of its members. The authenticated user must be a member of the group.
Note :- Requires `auth_token` cookie.
controller :- `getChatGroupInfoController`
response :-
```json
{
    "status": true,
    "message": "Chat group information fetched successfully.",
    "data": {
        "name": "Tech Enthusiasts",
        "icon": "http://cloudinary.com/...",
        "description": "A group for tech lovers",
        "members": [
            {
                "user_id": "65cad...",
                "id": "21001",
                "username": "john_doe",
                "isAdmin": true
            },
            {
                "user_id": "65cad...",
                "id": "21003",
                "username": "jane_doe",
                "isAdmin": false
            }
        ]
    }
}
```

### 5. /announcement/info/:groupId
Method :- `GET`
Description :- Fetches detailed information about a specific announcement group, including a list of its members. The authenticated user must be a member of the group.
Note :- Requires `auth_token` cookie.
controller :- `getAnnouncementGroupInfoController`
response :-
```json
{
    "status": true,
    "message": "Announcement group information fetched successfully.",
    "data": {
        "name": "Exam Updates",
        "icon": null,
        "description": "Official exam announcements",
        "members": [
            {
                "user_id": "65cad...",
                "id": "21001",
                "username": "john_doe",
                "isAdmin": true
            },
            {
                "user_id": "65cad...",
                "id": "21004",
                "username": "test_user",
                "isAdmin": false
            }
        ]
    }
}
```

### 6. /chat/members-keys/:groupId
Method :- `GET`
Description :- Fetches public keys for all members of a chat group. Each key is decrypted by the server before sending. The authenticated user must be a member of the group.
Note :- Requires `auth_token` cookie.
controller :- `getChatGroupMembersKeysController`
response :-
```json
{
    "status": true,
    "message": "Chat group members keys fetched successfully.",
    "data": [
        {
            "user_id": "65cad...",
            "publicKey": "-----BEGIN PUBLIC KEY-----\nMIIBIjANBgkqhkiG9w0B..."
        }
    ]
}
```

### 7. /announcement/is-admin/:groupId
Method :- `GET`
Description :- Checks if the currently authenticated user is an admin of a specific announcement group.
Note :- Requires `auth_token` cookie.
controller :- `isUserAdminOfAnnouncementGroupController`
response :-
```json
{
    "status": true,
    "message": "Admin status checked successfully.",
    "data": {
        "isAdmin": true
    }
}
```

### 8. /create
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

### 9. /chat/update/:groupId
Method :- `PUT`
Description :- Updates details for a specific chat group. The authenticated user must be an admin of the group.
Note :- Requires `auth_token` cookie. The JSON payload is NOT encrypted. Supports optional image upload (multipart/form-data).
Input :- 
* `image` (File, Optional) - Sent as multipart/form-data.
* `groupData` (String, Required) - JSON string containing group details.
`JSON Payload`:
```json
{
    "groupName": "Updated Chat Group Name",
    "description": "New description for the chat group.",
    "admins": ["21001", "21005"],
    "members": [
        { "rollNumber": "21001" },
        { "rollNumber": "21003" },
        { "rollNumber": "21005" }
    ]
}
```
controller :- `updateChatGroupController`
response :-
```json
{
    "status": true,
    "message": "Chat group updated successfully.",
    "data": {
        "id": "65cad...",
        "name": "Updated Chat Group Name",
        "description": "New description for the chat group.",
        "icon": "http://cloudinary.com/..."
    }
}
```

### 10. /announcement/update/:groupId
Method :- `PUT`
Description :- Updates details for a specific announcement group. The authenticated user must be an admin of the group.
Note :- Requires `auth_token` cookie. The JSON payload is NOT encrypted. Supports optional image upload (multipart/form-data).
Input :- 
* `image` (File, Optional) - Sent as multipart/form-data.
* `groupData` (String, Required) - JSON string containing group details.
`JSON Payload`:
```json
{
    "groupName": "Updated Announcement Group Name",
    "description": "New description for the announcement group.",
    "admins": ["21001", "21006"],
    "members": [
        { "rollNumber": "21001" },
        { "rollNumber": "21004" },
        { "rollNumber": "21006" }
    ]
}
```
controller :- `updateAnnouncementGroupController`
response :-
```json
{
    "status": true,
    "message": "Announcement group updated successfully.",
    "data": {
        "id": "65cad...",
        "name": "Updated Announcement Group Name",
        "description": "New description for the announcement group.",
        "icon": "http://cloudinary.com/..."
    }
}
```

### 11. /chat/delete/:groupId
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

### 12. /announcement/delete/:groupId
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
