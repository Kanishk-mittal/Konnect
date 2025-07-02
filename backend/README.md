# Konnect Backend

Express.js backend application built with TypeScript for the Konnect project.

## Features

- **Express.js** - Fast, unopinionated web framework
- **TypeScript** - Type-safe JavaScript
- **Security** - Helmet.js for security headers
- **CORS** - Cross-origin resource sharing configured
- **Logging** - Morgan for HTTP request logging
- **Error Handling** - Centralized error handling middleware
- **Development** - Hot reload with nodemon

## Getting Started

### Prerequisites

- Node.js (v18 or higher)
- npm or yarn

### Installation

1. Navigate to the backend directory:
```bash
cd backend
```

2. Install dependencies:
```bash
npm install
```

3. Copy environment variables:
```bash
cp .env.example .env
```

4. Update the `.env` file with your configuration.

### Development

Start the development server:
```bash
npm run dev
```

The server will start on `http://localhost:3001` (or the port specified in your .env file).

### Building for Production

Build the TypeScript code:
```bash
npm run build
```

Start the production server:
```bash
npm start
```

### Scripts

- `npm run dev` - Start development server with hot reload
- `npm run build` - Build TypeScript to JavaScript
- `npm start` - Start production server
- `npm run lint` - Run ESLint
- `npm run lint:fix` - Run ESLint and fix issues

## API Endpoints

### Health Check
- `GET /health` - Server health status

### API Routes
- `GET /api` - API information
- `GET /api/test` - Test endpoint
- `GET /api/users` - Users endpoint (placeholder)
- `POST /api/auth/login` - Login endpoint (placeholder)
- `POST /api/auth/register` - Register endpoint (placeholder)

## Project Structure

```
src/
├── app.ts              # Express app configuration
├── index.ts            # Application entry point
├── middleware/         # Custom middleware
│   └── errorHandler.ts # Error handling middleware
└── routes/             # Route definitions
    └── api.ts          # API routes
```

## Environment Variables

Create a `.env` file based on `.env.example`:

```env
NODE_ENV=development
PORT=3001
FRONTEND_URL=http://localhost:5173
```

## Contributing

1. Follow the existing code style
2. Add tests for new features
3. Update documentation as needed
4. Run linting before committing: `npm run lint:fix`

## License

This project is licensed under the ISC License.
