# Konnect

Konnect is an open-source, self-hosted, and security-focused chatting platform custom-designed for universities and educational institutions. 

Unlike casual chatting applications, Konnect is tailored specifically for academic environments by providing advanced group management and club management features to foster structured, organized intra-college communication.

## Features

- **University-Centric Architecture:** Robust workflows designed specifically for students, faculty, clubs, and college announcements.
- **Advanced Group & Club Management:** Superior control over permissions, memberships, and roles, which are often missing in general-purpose chatting apps.
- **End-to-End Encryption:** True privacy for sensitive conversations. Messages and payloads are end-to-end encrypted to ensure secure communication internally.
- **Self-Hosted & Open-Source:** Grants colleges complete control and ownership over their community's data.

## Tech Stack

**Frontend:**
- React (v19) with TypeScript
- Vite
- Tailwind CSS (v4)
- Redux Toolkit
- React Router Dom
- Socket.io Client
- Node-forge (for client-side cryptography)

**Backend:**
- Node.js & Express
- TypeScript
- MongoDB (Mongoose)
- Socket.io (for real-time messaging)
- Multer & Cloudinary (for media uploads)
- Node-forge & Bcrypt (for security and encryption)
- Zod (for request validation)

