# Collaborative Whiteboard Web Application For P.C.S - Project Structure

## Directory Structure

```
pcsdraw/
├── client/                      # Frontend React application
│   ├── public/                  # Static files
│   └── src/
│       ├── components/          # React components
│       │   ├── Canvas/          # Whiteboard canvas components
│       │   ├── Toolbar/         # Toolbar and controls
│       │   ├── Auth/            # Authentication components
│       │   ├── Workspace/       # Workspace management UI
│       │   └── common/          # Reusable UI components
│       ├── hooks/               # Custom React hooks
│       ├── context/             # React context providers
│       ├── services/            # API and WebSocket services
│       ├── utils/               # Utility functions
│       ├── pages/               # Page components
│       ├── styles/              # Global styles and Tailwind config
│       ├── types/               # TypeScript type definitions
│       ├── App.tsx              # Main application component
│       └── index.tsx            # Application entry point
│
├── server/                      # Backend Node.js/Express application
│   ├── src/
│   │   ├── controllers/         # Request handlers
│   │   ├── middleware/          # Express middleware
│   │   ├── models/              # Data models
│   │   ├── routes/              # API route definitions
│   │   ├── services/            # Business logic
│   │   ├── socket/              # WebSocket handlers
│   │   ├── utils/               # Utility functions
│   │   ├── config/              # Configuration files
│   │   └── app.js               # Express application setup
│   ├── tests/                   # Backend tests
│   └── package.json             # Backend dependencies
│
├── database/                    # Database scripts and migrations
│   ├── migrations/              # Database migration files
│   ├── seeds/                   # Seed data for development
│   └── schema/                  # Database schema definitions
│
├── design/                      # UI/UX design assets
│   ├── wireframes/              # Application wireframes
│   ├── mockups/                 # Visual design mockups
│   ├── assets/                  # Icons, images, and other assets
│   └── design-system/           # Design system documentation
│
├── docs/                        # Project documentation
│   ├── api/                     # API documentation
│   ├── architecture/            # Architecture diagrams
│   └── guides/                  # Development guides
│
├── tests/                       # End-to-end and integration tests
│   ├── e2e/                     # End-to-end tests
│   └── integration/             # Integration tests
│
├── .github/                     # GitHub workflows and templates
├── .gitignore                   # Git ignore file
├── package.json                 # Root package.json for scripts
└── README.md                    # Project overview
```

## Key Technology Components

### Frontend
- **Next.js,TypeScript**: Core UI library
- **TailwindCSS**: Styling framework
- **Socket.io-client** or **WebRTC**: Real-time communication
- **Fabric.js** or **Konva.js**: Canvas manipulation library
- **React Router**: Client-side routing
- **Zustand** or **Redux**: State management
- **React Query**: Data fetching and caching

### Backend
- **Node.js/Express**: Server framework
- **Socket.io**: WebSocket server
- **Passport.js**: Authentication middleware
- **JWT**: Token-based authentication
- **Joi** or **Zod**: Request validation
- **Winston**: Logging

### Database
- **Firebase Firestore** or **MongoDB**: Document database
- **Redis**: Caching and real-time presence

### DevOps
- **Jest**: Testing framework
- **Cypress**: End-to-end testing
- **ESLint/Prettier**: Code quality tools
- **Docker**: Containerization
- **GitHub Actions**: CI/CD

## Data Models

### User
```
{
  id: string,
  email: string,
  password: string (hashed),
  name: string,
  avatar: string (optional),
  createdAt: timestamp,
  updatedAt: timestamp
}
```

### Workspace
```
{
  id: string,
  name: string,
  description: string,
  ownerId: string (user id),
  members: [
    {
      userId: string,
      role: string (viewer, editor, admin)
    }
  ],
  createdAt: timestamp,
  updatedAt: timestamp
}
```

### Whiteboard
```
{
  id: string,
  name: string,
  workspaceId: string,
  thumbnail: string (optional),
  currentVersion: number,
  createdBy: string (user id),
  createdAt: timestamp,
  updatedAt: timestamp
}
```

### WhiteboardVersion
```
{
  id: string,
  whiteboardId: string,
  version: number,
  data: object (encrypted),
  createdBy: string (user id),
  createdAt: timestamp
}
```

### WhiteboardElement
```
{
  id: string,
  whiteboardId: string,
  type: string (rectangle, circle, text, etc.),
  properties: object,
  position: {x: number, y: number},
  size: {width: number, height: number},
  rotation: number,
  zIndex: number,
  createdBy: string (user id),
  createdAt: timestamp,
  updatedAt: timestamp
}
```

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - User logout
- `GET /api/auth/me` - Get current user

### Workspaces
- `GET /api/workspaces` - List user's workspaces
- `POST /api/workspaces` - Create workspace
- `GET /api/workspaces/:id` - Get workspace details
- `PUT /api/workspaces/:id` - Update workspace
- `DELETE /api/workspaces/:id` - Delete workspace
- `POST /api/workspaces/:id/members` - Add workspace member
- `DELETE /api/workspaces/:id/members/:userId` - Remove workspace member

### Whiteboards
- `GET /api/workspaces/:workspaceId/whiteboards` - List whiteboards in workspace
- `POST /api/workspaces/:workspaceId/whiteboards` - Create whiteboard
- `GET /api/whiteboards/:id` - Get whiteboard details
- `PUT /api/whiteboards/:id` - Update whiteboard
- `DELETE /api/whiteboards/:id` - Delete whiteboard
- `GET /api/whiteboards/:id/versions` - List whiteboard versions
- `GET /api/whiteboards/:id/versions/:versionId` - Get specific version
- `POST /api/whiteboards/:id/export` - Export whiteboard

## WebSocket Events

### Connection
- `connect` - Client connects to server
- `disconnect` - Client disconnects from server
- `join-board` - Client joins a whiteboard session
- `leave-board` - Client leaves a whiteboard session

### Whiteboard Operations
- `element-created` - New element created
- `element-updated` - Element updated
- `element-deleted` - Element deleted
- `board-cleared` - Entire board cleared
- `cursor-position` - User cursor position update
- `selection-changed` - User selection changed

## Security Considerations

1. **Authentication**
   - JWT-based authentication with proper expiration
   - Secure password storage with bcrypt
   - CSRF protection

2. **Authorization**
   - Role-based access control for workspaces and whiteboards
   - Validation of user permissions for each operation

3. **Data Security**
   - End-to-end encryption for whiteboard data
   - HTTPS for all communications
   - Input validation to prevent injection attacks

4. **Real-time Security**
   - Authenticated WebSocket connections
   - Rate limiting for real-time operations
   - Validation of all incoming WebSocket messages