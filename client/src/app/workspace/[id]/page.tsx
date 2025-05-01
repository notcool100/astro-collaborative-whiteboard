'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

// Mock data for whiteboards
const mockWhiteboards = [
  {
    id: '1',
    name: 'Product Roadmap',
    lastEdited: '2 days ago',
    editedBy: 'John Doe',
    thumbnail: '/thumbnails/board1.jpg',
  },
  {
    id: '2',
    name: 'UI Design Brainstorm',
    lastEdited: '1 week ago',
    editedBy: 'Sarah Johnson',
    thumbnail: '/thumbnails/board2.jpg',
  },
  {
    id: '3',
    name: 'Sprint Planning',
    lastEdited: '1 hour ago',
    editedBy: 'Mike Wilson',
    thumbnail: '/thumbnails/board3.jpg',
  },
  {
    id: '4',
    name: 'Customer Journey Map',
    lastEdited: '3 weeks ago',
    editedBy: 'Sarah Johnson',
    thumbnail: '/thumbnails/board4.jpg',
  },
  {
    id: '5',
    name: 'Feature Ideas',
    lastEdited: '2 days ago',
    editedBy: 'John Doe',
    thumbnail: '/thumbnails/board5.jpg',
  },
];

// Mock workspace data
const mockWorkspace = {
  id: '1',
  name: 'Personal Projects',
  description: 'My personal design and brainstorming projects',
  owner: 'John Doe',
  members: 5,
};

export default function WorkspaceDetail({ params }: { params: { id: string } }) {
  const router = useRouter();
  const workspaceId = params.id;
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newWhiteboardName, setNewWhiteboardName] = useState('');
  const [whiteboards, setWhiteboards] = useState(mockWhiteboards);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterOption, setFilterOption] = useState('all');
  const [workspace] = useState(mockWorkspace);

  const filteredWhiteboards = whiteboards.filter(whiteboard => {
    const matchesSearch = whiteboard.name.toLowerCase().includes(searchQuery.toLowerCase());
    
    if (filterOption === 'all') return matchesSearch;
    if (filterOption === 'recent') {
      return matchesSearch && (
        whiteboard.lastEdited.includes('hour') || 
        whiteboard.lastEdited.includes('day')
      );
    }
    if (filterOption === 'mine') {
      return matchesSearch && whiteboard.editedBy === 'John Doe';
    }
    
    return matchesSearch;
  });

  const handleCreateWhiteboard = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newWhiteboardName.trim()) return;
    
    // In a real app, this would make an API call
    const newWhiteboard = {
      id: Date.now().toString(),
      name: newWhiteboardName,
      lastEdited: 'Just now',
      editedBy: 'John Doe',
      thumbnail: '/thumbnails/new-board.jpg',
    };
    
    setWhiteboards([...whiteboards, newWhiteboard]);
    setNewWhiteboardName('');
    setIsCreateModalOpen(false);
    
    // Navigate to the new whiteboard
    router.push(`/whiteboard/${newWhiteboard.id}`);
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
                  onClick={() => router.push('/login')}
                  className="block w-full text-left px-4 py-2 text-sm text-text-secondary hover:bg-background"
                >
                  Sign out
                </button>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Back Navigation */}
      <div className="container mx-auto px-4 py-4">
        <Link href="/dashboard" className="text-text-secondary hover:text-text flex items-center">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" />
          </svg>
          Back to Workspaces
        </Link>
      </div>

      {/* Workspace Info */}
      <div className="container mx-auto px-4 py-4">
        <div className="bg-white border border-border rounded-lg p-6 mb-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-2xl font-bold text-text">{workspace.name}</h2>
              <p className="text-text-secondary mt-1">{workspace.description}</p>
              <div className="mt-2 text-sm text-text-secondary">
                <span>Created by {workspace.owner}</span>
                <span className="mx-2">•</span>
                <span>{workspace.members} members</span>
              </div>
            </div>
            <div className="mt-4 md:mt-0">
              <button className="btn btn-secondary">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
                </svg>
                Settings
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Whiteboards Section */}
      <main className="container mx-auto px-4 pb-12">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
          <h3 className="text-xl font-semibold text-text">Whiteboards</h3>
          <button 
            onClick={() => setIsCreateModalOpen(true)}
            className="btn btn-primary mt-2 md:mt-0"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
            </svg>
            New Whiteboard
          </button>
        </div>

        {/* Search and Filter */}
        <div className="flex flex-col md:flex-row md:items-center mb-6 gap-4">
          <div className="relative flex-1">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-text-secondary" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
              </svg>
            </div>
            <input
              type="text"
              placeholder="Search whiteboards..."
              className="input pl-10 w-full"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="relative">
            <select
              className="input appearance-none pr-10"
              value={filterOption}
              onChange={(e) => setFilterOption(e.target.value)}
            >
              <option value="all">All Whiteboards</option>
              <option value="recent">Recently Edited</option>
              <option value="mine">Created by Me</option>
            </select>
            <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-text-secondary" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </div>
          </div>
        </div>

        {/* Whiteboards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredWhiteboards.map((whiteboard) => (
            <Link 
              key={whiteboard.id} 
              href={`/whiteboard/${whiteboard.id}`}
              className="block group"
            >
              <div className="bg-white border border-border rounded-lg overflow-hidden shadow-sm transition-shadow duration-fast group-hover:shadow-md">
                <div className="aspect-video bg-gray-100 flex items-center justify-center">
                  {/* In a real app, this would be an actual thumbnail */}
                  <div className="text-4xl font-bold text-primary">
                    {whiteboard.name.charAt(0)}
                  </div>
                </div>
                <div className="p-4">
                  <h3 className="font-semibold text-lg text-text truncate group-hover:text-primary transition-colors duration-fast">
                    {whiteboard.name}
                  </h3>
                  <div className="flex justify-between mt-2 text-sm text-text-secondary">
                    <span>Edited {whiteboard.lastEdited}</span>
                    <span>by {whiteboard.editedBy}</span>
                  </div>
                </div>
              </div>
            </Link>
          ))}

          {/* Create New Whiteboard Card */}
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
                  Create New Whiteboard
                </h3>
                <p className="text-center text-text-secondary mt-2">
                  Start drawing and collaborating
                </p>
              </div>
            </div>
          </button>
        </div>
      </main>

      {/* Create Whiteboard Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-semibold text-text">Create New Whiteboard</h3>
                <button 
                  onClick={() => setIsCreateModalOpen(false)}
                  className="text-text-secondary hover:text-text"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <form onSubmit={handleCreateWhiteboard}>
                <div className="mb-4">
                  <label htmlFor="whiteboardName" className="input-label">
                    Whiteboard Name
                  </label>
                  <input
                    id="whiteboardName"
                    type="text"
                    className="input w-full"
                    placeholder="Enter whiteboard name"
                    value={newWhiteboardName}
                    onChange={(e) => setNewWhiteboardName(e.target.value)}
                    required
                  />
                </div>
                <div className="mb-4">
                  <label className="input-label">Template</label>
                  <div className="grid grid-cols-3 gap-3 mt-2">
                    <button
                      type="button"
                      className="border border-primary rounded-md p-2 flex flex-col items-center bg-primary-10"
                    >
                      <span className="text-sm font-medium text-primary">Blank</span>
                    </button>
                    <button
                      type="button"
                      className="border border-border rounded-md p-2 flex flex-col items-center"
                    >
                      <span className="text-sm font-medium">Grid</span>
                    </button>
                    <button
                      type="button"
                      className="border border-border rounded-md p-2 flex flex-col items-center"
                    >
                      <span className="text-sm font-medium">Wireframe</span>
                    </button>
                  </div>
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
                    disabled={!newWhiteboardName.trim()}
                  >
                    Create Whiteboard
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