# PCS Draw Backend

This is the backend server for PCS Draw, a collaborative whiteboard application. It provides RESTful APIs and WebSocket connections for real-time collaboration.

## Table of Contents

- [Technologies](#technologies)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [API Documentation](#api-documentation)
- [Database](#database)
- [WebSockets](#websockets)
- [Authentication](#authentication)
- [Testing](#testing)
- [Deployment](#deployment)

## Technologies

- **Node.js**: JavaScript runtime
- **Express**: Web framework
- **PostgreSQL**: Primary database
- **Redis**: For caching, session management, and pub/sub
- **Socket.IO**: For real-time communication
- **JWT**: For authentication
- **bcrypt**: For password hashing
- **Winston**: For logging

## Project Structure

```
server/
├── docs/                  # Documentation
│   ├── API_DOCUMENTATION.md
│   └── DATABASE_SCHEMA.md
├── src/                   # Source code
│   ├── config/            # Configuration files
│   │   ├── database.js    # Database configuration
│   │   ├── redis.js       # Redis configuration
│   │   └── socket.js      # Socket.IO configuration
│   ├── controllers/       # Request handlers
│   │   ├── auth.controller.js
│   │   ├── whiteboard.controller.js
│   │   └── workspace.controller.js
│   ├── middleware/        # Express middleware
│   │   ├── auth.js        # Authentication middleware
│   │   ├── errorHandler.js # Error handling middleware
│   │   └── validation.js  # Request validation middleware
│   ├── models/            # Database models (if using ORM)
│   ├── routes/            # API routes
│   │   ├── auth.routes.js
│   │   ├── whiteboard.routes.js
│   │   └── workspace.routes.js
│   ├── services/          # Business logic
│   │   ├── user.service.js
│   │   ├── whiteboard.service.js
│   │   └── workspace.service.js
│   ├── sockets/           # WebSocket handlers
│   │   ├── whiteboard.socket.js
│   │   └── socket.handlers.js
│   ├── utils/             # Utility functions
│   │   ├── logger.js
│   │   └── helpers.js
│   ├── app.js             # Express app setup
│   └── server.js          # Server entry point
├── migrations/            # Database migrations
├── tests/                 # Tests
├── .env.example           # Example environment variables
├── package.json           # Dependencies and scripts
└── README.md              # This file
```

## Getting Started

### Prerequisites

- Node.js (v16 or higher)
- PostgreSQL (v13 or higher)
- Redis (v6 or higher)

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/pcsdraw.git
   cd pcsdraw/server
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create a `.env` file based on `.env.example`:
   ```bash
   cp .env.example .env
   ```

4. Set up the database:
   ```bash
   # Create the database
   createdb pcsdraw

   # Run migrations
   npm run migrate
   ```

5. Start the development server:
   ```bash
   npm run dev
   ```

The server will be running at `http://localhost:3001`.

## Environment Variables

Create a `.env` file in the server directory with the following variables:

```
# Server
PORT=3001
NODE_ENV=development

# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=pcsdraw
DB_USER=postgres
DB_PASSWORD=yourpassword

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_DB=0
REDIS_TLS=false

# JWT
JWT_SECRET=your-secret-key
JWT_EXPIRATION=24h

# Logging
LOG_LEVEL=info

# CORS
CORS_ORIGIN=http://localhost:3000
```

## API Documentation

Detailed API documentation is available in the [API Documentation](./docs/API_DOCUMENTATION.md) file.

## Database

The application uses PostgreSQL as its primary database. The database schema is documented in the [Database Schema](./docs/DATABASE_SCHEMA.md) file.

### Migrations

Database migrations are managed using a migration tool. To run migrations:

```bash
npm run migrate
```

To create a new migration:

```bash
npm run migrate:create -- migration-name
```

To rollback the last migration:

```bash
npm run migrate:down
```

## WebSockets

The application uses Socket.IO for real-time communication. WebSocket events are documented in the [API Documentation](./docs/API_DOCUMENTATION.md#real-time-collaboration) file.

### Socket.IO Namespaces

- `/whiteboard`: For whiteboard collaboration

### Socket.IO Events

- `join-whiteboard`: Join a whiteboard room
- `leave-whiteboard`: Leave a whiteboard room
- `element-update`: Update an element
- `element-delete`: Delete an element
- `cursor-position`: Update cursor position

## Authentication

The application uses JWT (JSON Web Token) for authentication. The token is included in the Authorization header for API requests and in the auth object for WebSocket connections.

### JWT Payload

```json
{
  "userId": 1,
  "iat": 1623744000,
  "exp": 1623830400
}
```

### Token Blacklisting

When a user logs out, their token is added to a blacklist in Redis until it expires.

## Testing

The application uses Jest for testing. To run tests:

```bash
# Run all tests
npm test

# Run tests with coverage
npm run test:coverage

# Run specific test file
npm test -- tests/auth.test.js
```

## Deployment

### Docker

The application can be deployed using Docker. A Dockerfile and docker-compose.yml file are provided.

To build and run the Docker container:

```bash
# Build the image
docker build -t pcsdraw-server .

# Run the container
docker run -p 3001:3001 --env-file .env pcsdraw-server
```

### Docker Compose

To run the entire stack (server, database, Redis) using Docker Compose:

```bash
docker-compose up -d
```

### Production Deployment

For production deployment, consider the following:

1. Use a process manager like PM2
2. Set up a reverse proxy with Nginx
3. Configure SSL/TLS
4. Set up monitoring and logging
5. Configure database backups

Example PM2 configuration:

```json
{
  "apps": [
    {
      "name": "pcsdraw-server",
      "script": "src/server.js",
      "instances": "max",
      "exec_mode": "cluster",
      "env_production": {
        "NODE_ENV": "production",
        "PORT": 3001
      }
    }
  ]
}
```

## Contributing

Please read the [CONTRIBUTING.md](../CONTRIBUTING.md) file for details on our code of conduct and the process for submitting pull requests.

## License

This project is licensed under the MIT License - see the [LICENSE](../LICENSE) file for details.