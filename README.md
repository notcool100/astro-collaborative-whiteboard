# PCS Draw - Collaborative Whiteboard Web Application

PCS Draw is a real-time collaborative whiteboard web application inspired by Excalidraw Pro. It allows multiple users to draw, design, and collaborate on a shared canvas in real-time.

## Project Documentation

This repository contains the following documentation:

1. [Project Requirements](./requirement.md) - Original project requirements and feature specifications
2. [Task Assignments](./task_assignments.md) - Breakdown of tasks for each team member
3. [Project Structure](./project_structure.md) - Detailed project architecture and organization
4. [Development Roadmap](./development_roadmap.md) - Timeline and milestones for project completion

## Features

- Interactive whiteboard canvas with drawing tools
- Real-time collaboration with multiple users
- Shape drawing (rectangle, circle, arrows)
- Text and freehand drawing
- Comprehensive toolbar with selection, drawing, and editing tools
- User authentication with role-based access
- Cloud storage for whiteboards
- Export options (PNG, SVG, JSON)
- End-to-end encryption
- Responsive design for all devices
- Workspace organization
- Version history

## Technology Stack

- **Frontend**: Next.js,TypeScript, TailwindCSS
- **Backend**: Node.js, Express
- **Real-time Communication**: WebSockets/WebRTC
- **Database**: To be determined (Firebase or alternative)
- **Authentication**: JWT-based system

## Getting Started

### Prerequisites

- Node.js (v14 or higher)
- npm or yarn
- Git

### Installation

1. Clone the repository
   ```
   git clone https://github.com/yourusername/pcsdraw.git
   cd pcsdraw
   ```

2. Install dependencies
   ```
   # Install root dependencies
   npm install

   # Install client dependencies
   cd client
   npm install

   # Install server dependencies
   cd ../server
   npm install
   ```

3. Set up environment variables
   ```
   # Create .env files in both client and server directories
   # See .env.example for required variables
   ```

4. Start development servers
   ```
   # Start backend server
   cd server
   npm run dev

   # Start frontend server
   cd ../client
   npm start
   ```

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