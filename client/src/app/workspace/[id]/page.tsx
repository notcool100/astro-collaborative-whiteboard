'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useWhiteboards, useWorkspaceDetails } from '@/hooks/useWhiteboards';
import { formatDistanceToNow } from 'date-fns';

export default function WorkspaceDetail({ params }: { params: { id: string } }) {
  const router = useRouter();
  const workspaceId = params.id;
  const { user, logout } = useAuth();
  
  const { 
    workspace, 
    isLoading: isWorkspaceLoading 
  } = useWorkspaceDetails(workspaceId);
  
  const { 
    whiteboards, 
    isLoading: isWhiteboardsLoading,
    createWhiteboard,
    isCreating
  } = useWhiteboards(workspaceId);
  
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newWhiteboardData, setNewWhiteboardData] = useState({
    name: '',
    tags: [] as string[],
    template: 'blank',
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [filterOption, setFilterOption] = useState('all');
  const [errors, setErrors] = useState<Record<string, string>>({});
  
  const isLoading = isWorkspaceLoading || isWhiteboardsLoading;

  const filteredWhiteboards = whiteboards.filter(whiteboard => {
    const matchesSearch = whiteboard.name.toLowerCase().includes(searchQuery.toLowerCase());
    
    if (filterOption === 'all') return matchesSearch;
    if (filterOption === 'recent') {
      // Filter for whiteboards updated in the last 48 hours
      const twoDaysAgo = new Date();
      twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);
      return matchesSearch && new Date(whiteboard.updated_at) >= twoDaysAgo;
    }
    if (filterOption === 'mine') {
      return matchesSearch && whiteboard.created_by_name === user?.name;
    }
    
    return matchesSearch;
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    
    setNewWhiteboardData({
      ...newWhiteboardData,
      [name]: value,
    });
    
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors({
        ...errors,
        [name]: '',
      });
    }
  };

  const handleTagChange = (tag: string) => {
    const currentTags = [...newWhiteboardData.tags];
    
    if (currentTags.includes(tag)) {
      // Remove tag if already selected
      setNewWhiteboardData({
        ...newWhiteboardData,
        tags: currentTags.filter(t => t !== tag),
      });
    } else {
      // Add tag if not already selected
      setNewWhiteboardData({
        ...newWhiteboardData,
        tags: [...currentTags, tag],
      });
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    
    if (!newWhiteboardData.name.trim()) {
      newErrors.name = 'Whiteboard name is required';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleCreateWhiteboard = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    try {
      const newWhiteboard = await createWhiteboard({
        name: newWhiteboardData.name,
        tags: newWhiteboardData.tags,
      });
      
      setNewWhiteboardData({
        name: '',
        tags: [],
        template: 'blank',
      });
      
      setIsCreateModalOpen(false);
      
      // Navigate to the new whiteboard
      router.push(`/whiteboard/${newWhiteboard.uuid}`);
    } catch (error) {
      console.error('Error creating whiteboard:', error);
      setErrors({
        form: 'Failed to create whiteboard. Please try again.',
      });
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
      // The auth context will handle the redirect to login
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  // Function to format date
  const formatDate = (dateString: string) => {
    try {
      return formatDistanceToNow(new Date(dateString), { addSuffix: true });
    } catch (error) {
      return 'Unknown date';
    }
  };

  // Get user initials for avatar
  const getUserInitials = () => {
    if (!user || !user.name) return '?';
    
    const nameParts = user.name.split(' ');
    if (nameParts.length === 1) return nameParts[0].charAt(0).toUpperCase();
    
    return (nameParts[0].charAt(0) + nameParts[nameParts.length - 1].charAt(0)).toUpperCase();
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
                  <span className="text-sm font-medium">{getUserInitials()}</span>
                </div>
                <span className="hidden md:inline-block text-text">{user?.name || 'User'}</span>
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

      {/* Back Navigation */}
      <div className="container mx-auto px-4 py-4">
        <Link href="/dashboard" className="text-text-secondary hover:text-text flex items-center">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" />
          </svg>
          Back to Workspaces
        </Link>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="container mx-auto px-4 py-12 flex justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
        </div>
      )}

      {/* Workspace Info */}
      {!isLoading && workspace && (
        <div className="container mx-auto px-4 py-4">
          <div className="bg-white border border-border rounded-lg p-6 mb-8">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between">
              <div>
                <h2 className="text-2xl font-bold text-text">{workspace.name}</h2>
                <p className="text-text-secondary mt-1">{workspace.description || 'No description'}</p>
                <div className="mt-2 text-sm text-text-secondary">
                  <span>Created by {workspace.owner_name}</span>
                  <span className="mx-2">•</span>
                  <span>{workspace.members?.length || 0} members</span>
                  <span className="mx-2">•</span>
                  <span>Your role: {workspace.userRole}</span>
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
      )}

      {/* Whiteboards Section */}
      {!isLoading && (
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

          {/* Empty State */}
          {!isLoading && filteredWhiteboards.length === 0 && (
            <div className="bg-white border border-border rounded-lg p-8 text-center">
              <div className="w-16 h-16 mx-auto bg-primary-10 rounded-full flex items-center justify-center mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-primary" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M5 3a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2V5a2 2 0 00-2-2H5zm0 2h10v7h-2l-1 2H8l-1-2H5V5z" clipRule="evenodd" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold mb-2">No whiteboards found</h3>
              <p className="text-text-secondary mb-6">
                {searchQuery 
                  ? `No whiteboards match "${searchQuery}"`
                  : "This workspace doesn't have any whiteboards yet. Create your first whiteboard to get started."}
              </p>
              <button 
                onClick={() => setIsCreateModalOpen(true)}
                className="btn btn-primary"
              >
                Create New Whiteboard
              </button>
            </div>
          )}

          {/* Whiteboards Grid */}
          {!isLoading && filteredWhiteboards.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {filteredWhiteboards.map((whiteboard) => (
                <Link 
                  key={whiteboard.uuid} 
                  href={`/whiteboard/${whiteboard.uuid}`}
                  className="block group"
                >
                  <div className="bg-white border border-border rounded-lg overflow-hidden shadow-sm transition-shadow duration-fast group-hover:shadow-md">
                    <div className="aspect-video bg-gray-100 flex items-center justify-center">
                      {whiteboard.thumbnail ? (
                        <img 
                          src={whiteboard.thumbnail} 
                          alt={whiteboard.name} 
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="text-4xl font-bold text-primary">
                          {whiteboard.name.charAt(0)}
                        </div>
                      )}
                    </div>
                    <div className="p-4">
                      <h3 className="font-semibold text-lg text-text truncate group-hover:text-primary transition-colors duration-fast">
                        {whiteboard.name}
                      </h3>
                      <div className="flex flex-wrap gap-1 mt-2">
                        {whiteboard.tags && whiteboard.tags.map((tag, index) => (
                          <span 
                            key={index}
                            className="inline-block bg-primary-10 text-primary text-xs px-2 py-1 rounded"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                      <div className="flex justify-between mt-2 text-sm text-text-secondary">
                        <span>Edited {formatDate(whiteboard.updated_at)}</span>
                        <span>by {whiteboard.created_by_name}</span>
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
          )}
        </main>
      )}

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
              
              {errors.form && (
                <div className="bg-error-10 text-error p-3 rounded-md text-sm mb-4">
                  {errors.form}
                </div>
              )}
              
              <form onSubmit={handleCreateWhiteboard}>
                <div className="mb-4">
                  <label htmlFor="name" className="input-label">
                    Whiteboard Name
                  </label>
                  <input
                    id="name"
                    name="name"
                    type="text"
                    className={`input w-full ${errors.name ? 'input-error' : ''}`}
                    placeholder="Enter whiteboard name"
                    value={newWhiteboardData.name}
                    onChange={handleChange}
                    required
                  />
                  {errors.name && (
                    <p className="error-message">{errors.name}</p>
                  )}
                </div>
                
                <div className="mb-4">
                  <label className="input-label">Tags (Optional)</label>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {['design', 'brainstorm', 'meeting', 'planning', 'wireframe', 'diagram'].map((tag) => (
                      <button
                        key={tag}
                        type="button"
                        className={`px-3 py-1 rounded-full text-sm ${
                          newWhiteboardData.tags.includes(tag)
                            ? 'bg-primary text-white'
                            : 'bg-gray-100 text-text-secondary hover:bg-gray-200'
                        }`}
                        onClick={() => handleTagChange(tag)}
                      >
                        {tag}
                      </button>
                    ))}
                  </div>
                </div>
                
                <div className="mb-4">
                  <label className="input-label">Template</label>
                  <div className="grid grid-cols-3 gap-3 mt-2">
                    <button
                      type="button"
                      className={`border rounded-md p-2 flex flex-col items-center ${
                        newWhiteboardData.template === 'blank'
                          ? 'border-primary bg-primary-10'
                          : 'border-border'
                      }`}
                      onClick={() => setNewWhiteboardData({ ...newWhiteboardData, template: 'blank' })}
                    >
                      <span className={`text-sm font-medium ${
                        newWhiteboardData.template === 'blank' ? 'text-primary' : ''
                      }`}>Blank</span>
                    </button>
                    <button
                      type="button"
                      className={`border rounded-md p-2 flex flex-col items-center ${
                        newWhiteboardData.template === 'grid'
                          ? 'border-primary bg-primary-10'
                          : 'border-border'
                      }`}
                      onClick={() => setNewWhiteboardData({ ...newWhiteboardData, template: 'grid' })}
                    >
                      <span className={`text-sm font-medium ${
                        newWhiteboardData.template === 'grid' ? 'text-primary' : ''
                      }`}>Grid</span>
                    </button>
                    <button
                      type="button"
                      className={`border rounded-md p-2 flex flex-col items-center ${
                        newWhiteboardData.template === 'wireframe'
                          ? 'border-primary bg-primary-10'
                          : 'border-border'
                      }`}
                      onClick={() => setNewWhiteboardData({ ...newWhiteboardData, template: 'wireframe' })}
                    >
                      <span className={`text-sm font-medium ${
                        newWhiteboardData.template === 'wireframe' ? 'text-primary' : ''
                      }`}>Wireframe</span>
                    </button>
                  </div>
                </div>
                
                <div className="flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={() => setIsCreateModalOpen(false)}
                    className="btn btn-secondary"
                    disabled={isCreating}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={!newWhiteboardData.name.trim() || isCreating}
                  >
                    {isCreating ? (
                      <span className="flex items-center justify-center">
                        <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Creating...
                      </span>
                    ) : (
                      'Create Whiteboard'
                    )}
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