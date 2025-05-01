# PCS Draw - Frontend

This is the frontend application for PCS Draw, a real-time collaborative whiteboard web application.

## Features

- User authentication (login, registration, profile management)
- Workspace management (create, view, edit workspaces)
- Whiteboard creation and editing
- Real-time collaboration using WebSockets
- Responsive design for all device sizes

## Tech Stack

- **Next.js 14**: React framework with App Router
- **TypeScript**: For type safety
- **TailwindCSS**: For styling
- **React Query**: For data fetching and caching
- **Zustand**: For state management
- **Fabric.js**: For canvas manipulation
- **Socket.IO**: For real-time communication
- **Axios**: For API requests

## Getting Started

### Prerequisites

- Node.js 18.x or higher
- npm or yarn

### Installation

1. Clone the repository
2. Navigate to the client directory:
   ```bash
   cd pcsdraw/client
   ```
3. Install dependencies:
   ```bash
   npm install
   # or
   yarn install
   ```
4. Create a `.env.local` file in the client directory with the following variables:
   ```
   NEXT_PUBLIC_API_URL=http://localhost:3001/api
   ```

### Development

Run the development server:

```bash
npm run dev
# or
yarn dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser to see the application.

### Building for Production

Build the application:

```bash
npm run build
# or
yarn build
```

Start the production server:

```bash
npm run start
# or
yarn start
```

## Project Structure

```
client/
├── public/            # Static assets
├── src/
│   ├── app/           # Next.js App Router pages
│   ├── components/    # Reusable UI components
│   ├── context/       # React context providers
│   ├── hooks/         # Custom React hooks
│   ├── services/      # API services
│   ├── styles/        # Global styles
│   ├── types/         # TypeScript type definitions
│   └── utils/         # Utility functions
├── .env.local         # Environment variables (create this file)
├── next.config.js     # Next.js configuration
├── package.json       # Project dependencies
├── postcss.config.js  # PostCSS configuration
├── tailwind.config.js # Tailwind CSS configuration
└── tsconfig.json      # TypeScript configuration
```

## API Integration

The frontend communicates with the backend API using Axios. API services are defined in `src/services/api.ts`.

## Authentication

Authentication is handled using JWT tokens. The authentication flow is managed by the `AuthContext` provider in `src/context/AuthContext.tsx`.

## Responsive Design

The application follows a mobile-first approach and is designed to work on all device sizes. The responsive design is implemented using TailwindCSS breakpoints as defined in the design system.

## Collaboration

Real-time collaboration is implemented using Socket.IO. The whiteboard editor uses Fabric.js for canvas manipulation and Socket.IO for syncing changes between users.

## License

This project is licensed under the MIT License.