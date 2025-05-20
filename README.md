# Konnect

Konnect is an open-source, self-hosted and security-focused platform for intra-college communication within IIIT Kottayam.

## Table of Contents
- [Features](#features)
- [Architecture](#architecture)
- [Backend Setup](#backend-setup)
- [Frontend Setup](#frontend-setup)
- [Security Details](#security-details)
- [API Documentation](#api-documentation)
- [License](#license)

## Features

- Secure end-to-end encrypted messaging
- User authentication with email verification
- Group creation and management
- Real-time messaging via WebSockets
- Zero-knowledge security implementation
- Self-hosted solution for data sovereignty

## Architecture

Konnect uses a client-server architecture with:
- Backend: Python-based REST API server
- Frontend: React-based web application
- Database: MongoDB for data storage
- End-to-end encryption for secure communication

## Backend Setup

Follow these steps to set up the backend server:

### Step 1: Create a Python Virtual Environment

```bash
cd Backend
python -m venv venv

# Activate on Windows
venv\Scripts\activate

# Activate on Linux/macOS
source venv/bin/activate
```

### Step 2: Install Required Libraries

```bash
pip install -r requirements.txt
```

### Step 3: Create Environment Variables

Create a `.env` file in the Backend folder with the following variables:
```
MONGO_URI = <Mongo Uri>  (your own atlas or local MongoDB URI)
DB_NAME=Konnect
SECRET_KEY=secret
SENDER_EMAIL=<your email>  (put your email here)
SENDER_PASSWORD=<email password>   (go to gmail and create an app password and put it here)
JWT_SECRET_KEY=secret
AES_KEY_INTERNAL='i0aMCxqkGJpklT4G7JYg9A=='
AES_KEY_EXTERNAL='i0aMCxqkGJpklT4G7JYg9A=='
```

### Step 4: seed the Database
Run the following command to seed the database with initial data:

```bash
# For Windows
python seed.py
# For Linux/macOS
python3 seed.py
```


### Step 5: Start the Backend Server

```bash 
# For Windows
python wsgi.py
# For Linux/macOS
python3 wsgi.py
```

The backend server should now be running at http://localhost:5000 (or your configured port).

## Frontend Setup

Follow these steps to set up the frontend application:

### Step 1: Navigate to the Konnect Directory

Important: Node modules should be installed in the Konnect folder, NOT in the root directory.

### Step 2: Install Dependencies

```bash
cd Konnect
npm install
```

### Step 3: Start the Frontend Development Server

```bash
npm run dev
```

The frontend will be accessible at http://localhost:5173 (default Vite port).

### Step 4: Building for Production

```bash
npm run build
```

## Security Details

Konnect implements a robust security model with multiple encryption layers:

### Registration Process

- Frontend generates RSA key pairs for the user (USER_PRIVATE and USER_PUBLIC)
- AES keys are used for symmetric encryption
- Messages are encrypted end-to-end using recipients' public keys

### Key Management

- USER_PRIVATE: Never transmitted over network or stored on server
- USER_PUBLIC: Used by others to encrypt messages to the user
- SERVER_AES: Used to encrypt server-to-user communication
- USER_AES: Used to encrypt messages stored on frontend

For detailed security implementation, see the /Backend/REGISTRATION.md file.

## API Documentation

Detailed API documentation is available in /Backend/app/Backend_doc.md with information about:

- Authentication Endpoints
- User Information Endpoints
- Group Endpoints
- Messaging Endpoints
- WebSocket Events

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.