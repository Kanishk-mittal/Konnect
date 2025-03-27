# Konnect Backend API Documentation

This document provides detailed information about all backend endpoints in the Konnect application.

## Authentication Endpoints

### GET Public Key
- **URL**: `/publicKey`
- **Method**: `POST`
- **Description**: Returns the server's public RSA key used for encrypting sensitive information during login/registration.
- **Input**: None required
- **Output**: 
  - Success: `200 OK` with `{"public_key": "<PEM formatted public key>"}`

### Login
- **URL**: `/login`
- **Method**: `POST`
- **Description**: Authenticates users and provides JWT tokens for session management.
- **Input**:
  - `roll`: Base64 encoded and RSA encrypted roll number
  - `password`: Base64 encoded and RSA encrypted password
  - `publicKey`: Client's public key for secure communication
- **Output**:
  - Success: `200 OK` with `{"msg": "Login successful", "key": "<encrypted AES key>"}` and cookies set:
    - `access_token_cookie`: JWT token (httponly)
    - `csrf_access_token`: CSRF token
  - Error: `401 Unauthorized` for invalid credentials

### Register
- **URL**: `/register`
- **Method**: `POST`
- **Description**: Creates a new user account and immediately authenticates them.
- **Input**:
  - `roll`: Base64 encoded and RSA encrypted roll number
  - `password`: Base64 encoded and RSA encrypted password
  - `name`: Base64 encoded and RSA encrypted user name
  - `email`: Base64 encoded and RSA encrypted email address
  - `publicKey`: Client's public key
  - `otp`: OTP code received via email
- **Output**:
  - Success: `200 OK` with `{"msg": "Registration successful", "key": "<encrypted AES key>"}` and auth cookies
  - Error: 
    - `400 Bad Request` for invalid OTP
    - `409 Conflict` if account already exists

### Logout
- **URL**: `/logout`
- **Method**: `POST`
- **Description**: Ends the user session by invalidating tokens.
- **Input**: No body required, but requires valid JWT token in cookies
- **Output**:
  - Success: `200 OK` with `{"msg": "Logout successful", "user": "<roll_number>"}` and cleared cookies

### Request OTP
- **URL**: `/otp`
- **Method**: `POST`
- **Description**: Generates and sends a one-time password to the provided email.
- **Input**:
  - `email`: Email address to receive the OTP
- **Output**:
  - Success: `200 OK` with `{"msg": "OTP sent successfully", "expires_at": "<timestamp>"}`
  - Error: `400 Bad Request` if email is missing

## User Information Endpoints

### Check Protected Route
- **URL**: `/protected`
- **Method**: `POST`
- **Description**: Test endpoint to verify authentication status and retrieve basic user info.
- **Input**: No body required, but requires valid JWT token in cookies
- **Output**:
  - Success: `200 OK` with `{"logged_in_as": "<roll>", "name": "<name>", "email": "<email>", "role": "<role>", "status": "authenticated"}`
  - Error: `404 Not Found` if user not found

### Get AES Key
- **URL**: `/get_AES_key`
- **Method**: `POST`
- **Description**: Retrieves the user's AES encryption key.
- **Input**: No body required, but requires valid JWT token in cookies
- **Output**:
  - Success: `200 OK` with `{"key": "<encrypted_key>"}`

### Check Roll Number Availability
- **URL**: `/check_roll`
- **Method**: `POST`
- **Description**: Checks if a roll number is available for registration.
- **Input**:
  - `roll`: Base64 encoded and RSA encrypted roll number
- **Output**:
  - Success: `200 OK` with `{"available": true/false}`

### Get User Public Key
- **URL**: `/get_user_key`
- **Method**: `POST`
- **Description**: Retrieves another user's public key for secure messaging.
- **Input**:
  - `roll`: Roll number of the target user
- **Output**:
  - Success: `200 OK` with `{"key": "<public_key>", "user_roll": "<roll>"}`
  - Error: 
    - `400 Bad Request` if roll is missing
    - `404 Not Found` if user or key not found

### Get All Users
- **URL**: `/get_users`
- **Method**: `GET`
- **Description**: Returns a list of all users (excluding current user) for messaging.
- **Input**: No body required, but requires valid JWT token in cookies
- **Output**:
  - Success: `200 OK` with `{"users": [{"roll_number": "...", "name": "...", ...}, ...]}`

### Set User Offline
- **URL**: `/set_offline`
- **Method**: `POST`
- **Description**: Updates the current user's status to offline.
- **Input**: No body required, but requires valid JWT token in cookies
- **Output**:
  - Success: `200 OK` with `{"message": "Status set to offline"}`
  - Error: `404 Not Found` if user not found

## Group Endpoints

### Get User Groups
- **URL**: `/get_user_groups`
- **Method**: `GET`
- **Description**: Retrieves all groups the authenticated user belongs to.
- **Input**: No body required, but requires valid JWT token in cookies
- **Output**:
  - Success: `200 OK` with `{"user": "<roll>", "groups": [...]}`
  - Error: `404 Not Found` if user not found

### Get Group Keys
- **URL**: `/get_group_keys`
- **Method**: `POST`
- **Description**: Retrieves public keys of all members in a specific group.
- **Input**:
  - `group_id`: Unique identifier of the group
- **Output**:
  - Success: `200 OK` with `{"group_name": "...", "group_id": "...", "keys": [{"roll_number": "...", "public_key": "..."}, ...]}`
  - Error: 
    - `400 Bad Request` if group_id is missing
    - `403 Forbidden` if user is not a member
    - `404 Not Found` if group not found

### Get User Groups with Keys
- **URL**: `/get_user_groups_with_keys`
- **Method**: `GET`
- **Description**: Retrieves all user's groups including member keys for each group.
- **Input**: No body required, but requires valid JWT token in cookies
- **Output**:
  - Success: `200 OK` with `{"user": "<roll>", "groups": [{"id": "...", "name": "...", "description": "...", "role": "...", "members": [{"roll_number": "...", "public_key": "...", "role": "..."}], "member_count": n}, ...]}`
  - Error: `404 Not Found` if user not found

## Messaging Endpoints

### Get Messages
- **URL**: `/get_messages`
- **Method**: `GET`
- **Description**: Retrieves messages for the authenticated user.
- **Input**: No body required, but requires valid JWT token in cookies
- **Output**:
  - Success: `200 OK` with `{"user": "<roll>", "messages": [{"sender": "...", "receiver": "...", "message": "...", ...}, ...]}`
  - Error: `404 Not Found` if user not found

## WebSocket Events

### Send Message
- **Event**: `send_message`
- **Description**: Handles real-time message sending between users.
- **Input**:
  - `sender`: Encrypted sender roll number
  - `receiver`: Encrypted receiver roll number
  - `message`: Encrypted message content
  - `aes_key`: Encrypted AES key for the message
  - `timestamp`: Message timestamp
  - `group`: Optional group identifier (null for direct messages)
- **Output Events**:
  - Success (receiver online): Emits `new_message` event to receiver with message details
  - Success (receiver offline): Emits `message_stored` event to sender
  - Error: Emits `message_error` event to sender

## Notes

- All endpoints support OPTIONS method for CORS preflight requests
- Many endpoints require authentication via JWT token stored in cookies
- Sensitive data is encrypted using RSA/AES encryption
- Group operations check user membership before providing access