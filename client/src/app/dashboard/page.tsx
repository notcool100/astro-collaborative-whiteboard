'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

// Mock data for workspaces
const mockWorkspaces = [
  {
    id: '1',
    name: 'Personal Projects',
    boardCount: 5,
    lastEdited: '2 days ago',
  },
  {
    id: '2',
    name: 'Team Collaboration',
    boardCount: 8,
    lastEdited: '1 hour ago',
  },
  {
    id: '3',
    name: 'Client Presentations',
    boardCount: 3,
    lastEdited: '1 week ago',
  },
  {
    id: '4',
    name: 'UX Research',
    boardCount: 2,
    lastEdited: '3 days ago',
  },
  {
    id: '5',
    name: 'Product Roadmap',
    boardCount: 1,
    lastEdited: '2 weeks ago',
  },
];

export default function Dashboard() {
  const router = useRouter();
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newWorkspaceName, setNewWorkspaceName] = useState('');
  const [workspaces, setWorkspaces] = useState(mockWorkspaces);
  const [searchQuery, setSearchQuery] = useState('');

  const filteredWorkspaces = workspaces.filter(workspace => 
    workspace.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleCreateWorkspace = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newWorkspaceName.trim()) return;
    
    // In a real app, this would make an API call
    const newWorkspace = {
      id: Date.now().toString(),
      name: newWorkspaceName,
      boardCount: 0,
      lastEdited: 'Just now',
    };
    
    setWorkspaces([...workspaces, newWorkspace]);
    setNewWorkspaceName('');
    setIsCreateModalOpen(false);
  };

  const handleLogout = () => {
    // In a real app, this would call an auth service
    router.push('/login');
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-white border-b border-border">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center">
            <h1 className="text-2xl font-bold text-primary">PCS Draw</h1>
            <nav className="ml-8 hidden md:block">
              <ul className="flex space-x-6">
                <li>
                  <Link href="/dashboard" className="text-text-secondary hover:text-text font-medium">
                    Workspaces
                  </Link>
                </li>
                <li>
                  <Link href="/templates" className="text-text-secondary hover:text-text font-medium">
                    Templates
                  </Link>
                </li>
                <li>
                  <Link href="/help" className="text-text-secondary hover:text-text font-medium">
                    Help
                  </Link>
                </li>
              </ul>
            </nav>
          </div>
          <div className="flex items-center">
            <div className="relative group">
              <button className="flex items-center space-x-2">
                <div className="w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center">
                  <span className="text-sm font-medium">JD</span>
                </div>
                <span className="hidden md:inline-block text-text">John Doe</span>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-text-secondary" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>
              <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 z-10 hidden group-hover:block">
                <Link href="/settings/profile" className="block px-4 py-2 text-sm text-text-secondary hover:bg-background">
                  Profile Settings
                </Link>
                <Link href="/settings/account" className="block px-4 py-2 text-sm text-text-secondary hover:bg-background">
                  Account Settings
                </Link>
                <button 
                  onClick={handleLogout}
                  className="block w-full text-left px-4 py-2 text-sm text-text-secondary hover:bg-background"
                >
                  Sign out
                </button>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8">
          <div>
            <h2 className="text-3xl font-bold text-text">My Workspaces</h2>
            <p className="text-text-secondary mt-1">Manage and organize your whiteboards</p>
          </div>
          <div className="mt-4 md:mt-0">
            <button 
              onClick={() => setIsCreateModalOpen(true)}
              className="btn btn-primary"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
              </svg>
              New Workspace
            </button>
          </div>
        </div>

        {/* Search */}
        <div className="mb-6">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-text-secondary" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
              </svg>
            </div>
            <input
              type="text"
              placeholder="Search workspaces..."
              className="input pl-10 w-full md:w-80"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        {/* Workspaces Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredWorkspaces.map((workspace) => (
            <Link 
              key={workspace.id} 
              href={`/workspace/${workspace.id}`}
              className="block group"
            >
              <div className="bg-white border border-border rounded-lg overflow-hidden shadow-sm transition-shadow duration-fast group-hover:shadow-md">
                <div className="h-32 bg-primary-10 flex items-center justify-center">
                  <span className="text-4xl font-bold text-primary">
                    {workspace.name.charAt(0)}
                  </span>
                </div>
                <div className="p-4">
                  <h3 className="font-semibold text-lg text-text truncate group-hover:text-primary transition-colors duration-fast">
                    {workspace.name}
                  </h3>
                  <div className="flex justify-between mt-2 text-sm text-text-secondary">
                    <span>{workspace.boardCount} boards</span>
                    <span>Last: {workspace.lastEdited}</span>
                  </div>
                </div>
              </div>
            </Link>
          ))}

          {/* Create New Workspace Card */}
          <button 
            onClick={() => setIsCreateModalOpen(true)}
            className="block group"
          >
            <div className="bg-white border border-border border-dashed rounded-lg overflow-hidden h-full shadow-sm transition-shadow duration-fast group-hover:shadow-md">
              <div className="h-full flex flex-col items-center justify-center p-6">
                <div className="w-12 h-12 rounded-full bg-primary-10 flex items-center justify-center mb-4">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-primary" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
                  </svg>
                </div>
                <h3 className="font-semibold text-lg text-text group-hover:text-primary transition-colors duration-fast">
                  Create New Workspace
                </h3>
                <p className="text-center text-text-secondary mt-2">
                  Start organizing your whiteboards
                </p>
              </div>
            </div>
          </button>
        </div>
      </main>

      {/* Create Workspace Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-semibold text-text">Create New Workspace</h3>
                <button 
                  onClick={() => setIsCreateModalOpen(false)}
                  className="text-text-secondary hover:text-text"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <form onSubmit={handleCreateWorkspace}>
                <div className="mb-4">
                  <label htmlFor="workspaceName" className="input-label">
                    Workspace Name
                  </label>
                  <input
                    id="workspaceName"
                    type="text"
                    className="input w-full"
                    placeholder="Enter workspace name"
                    value={newWorkspaceName}
                    onChange={(e) => setNewWorkspaceName(e.target.value)}
                    required
                  />
                </div>
                <div className="flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={() => setIsCreateModalOpen(false)}
                    className="btn btn-secondary"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={!newWorkspaceName.trim()}
                  >
                    Create Workspace
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}