# PCS Draw - Collaborative Whiteboard Web Application

PCS Draw is a real-time collaborative whiteboard web application that enables teams to brainstorm, design, and collaborate seamlessly on a shared canvas in real-time.

## Project Documentation

This repository contains the following documentation:

1. [Project Requirements](./requirement.md) - Original project requirements and feature specifications
2. [Task Assignments](./task_assignments.md) - Breakdown of tasks for each team member
3. [Project Structure](./project_structure.md) - Detailed project architecture and organization
4. [Development Roadmap](./development_roadmap.md) - Timeline and milestones for project completion

## Features

- **User Authentication**: Secure login, registration, and profile management
- **Workspace Management**: Create and organize workspaces for different projects or teams
- **Whiteboard Editor**: Powerful drawing tools including shapes, text, and freehand drawing
- **Real-time Collaboration**: See changes as they happen with multiple users
- **Version History**: Track changes and revert to previous versions
- **Responsive Design**: Works on desktop, tablet, and mobile devices
- **Sharing Options**: Share whiteboards with specific permissions
- **Export Options**: Export as PNG, SVG, or JSON
- **End-to-end Encryption**: Optional encryption for sensitive content

## Technology Stack

### Frontend
- **Next.js 14**: React framework with App Router
- **TypeScript**: For type safety
- **TailwindCSS**: For styling
- **React Query**: For data fetching and caching
- **Zustand**: For state management
- **Fabric.js**: For canvas manipulation
- **Socket.IO Client**: For real-time communication

### Backend
- **Node.js**: JavaScript runtime
- **Express**: Web framework
- **PostgreSQL**: Database for persistent storage
- **Redis**: For caching and pub/sub
- **Socket.IO**: For WebSocket communication
- **JWT**: For authentication
- **Zod**: For validation

## Project Structure

```
pcsdraw/
├── client/             # Frontend application (Next.js)
├── server/             # Backend API (Express)
├── design/             # Design assets and documentation
│   ├── design-system/  # Design system documentation
│   └── wireframes/     # Wireframe documentation
├── .env                # Environment variables (create from .env.example)
└── package.json        # Project scripts
```

## Getting Started

### Prerequisites

- Node.js 16.x or higher
- npm or yarn
- PostgreSQL 14.x or higher
- Redis (optional, can be disabled in development)

### Installation

1. Clone the repository
   ```bash
   git clone https://github.com/yourusername/pcsdraw.git
   cd pcsdraw
   ```

2. Copy `.env.example` to `.env` and update the values

3. Install dependencies:
   ```bash
   npm run install:all
   ```

4. Initialize the database:
   ```bash
   npm run db:init
   npm run db:seed  # Optional: Add sample data
   ```

5. Start the development servers:
   ```bash
   npm run dev
   ```

### Development

- Frontend: http://localhost:3000
- Backend API: http://localhost:3001
- API Documentation: http://localhost:3001/api-docs

## Development Workflow

1. Create a new branch for each feature or bug fix
2. Submit pull requests for code review
3. Ensure all tests pass before merging
4. Follow the coding standards and guidelines

## Team Structure

- **Frontend Developer** - Responsible for React application and UI implementation
- **Backend Developer** - Handles server-side logic, API, and WebSocket implementation
- **Database Architect** - Designs and optimizes database structure
- **UI/UX Designer** - Creates visual designs and user experience flows
- **QA Tester** - Ensures quality through comprehensive testing

## Contributing

Please read [CONTRIBUTING.md](./CONTRIBUTING.md) for details on our code of conduct and the process for submitting pull requests.



## Acknowledgments

- Inspired by Excalidraw Pro
- Built with modern web technologies
- Designed for seamless collaboration