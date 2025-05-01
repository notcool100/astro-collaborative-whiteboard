'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useWorkspaces } from '@/hooks/useWorkspaces';
import { formatDistanceToNow } from 'date-fns';

export default function Dashboard() {
  const router = useRouter();
  const { user, logout } = useAuth();
  const { 
    workspaces, 
    isLoading, 
    createWorkspace, 
    isCreating 
  } = useWorkspaces();
  
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newWorkspaceData, setNewWorkspaceData] = useState({
    name: '',
    description: '',
    isPublic: false,
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const filteredWorkspaces = workspaces.filter(workspace => 
    workspace.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;
    
    setNewWorkspaceData({
      ...newWorkspaceData,
      [name]: type === 'checkbox' ? checked : value,
    });
    
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors({
        ...errors,
        [name]: '',
      });
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    
    if (!newWorkspaceData.name.trim()) {
      newErrors.name = 'Workspace name is required';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleCreateWorkspace = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    try {
      await createWorkspace({
        name: newWorkspaceData.name,
        description: newWorkspaceData.description,
        isPublic: newWorkspaceData.isPublic,
        defaultPermission: 'view',
      });
      
      setNewWorkspaceData({
        name: '',
        description: '',
        isPublic: false,
      });
      
      setIsCreateModalOpen(false);
    } catch (error) {
      console.error('Error creating workspace:', error);
      setErrors({
        form: 'Failed to create workspace. Please try again.',
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

        {/* Loading State */}
        {isLoading && (
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
          </div>
        )}

        {/* Empty State */}
        {!isLoading && filteredWorkspaces.length === 0 && (
          <div className="bg-white border border-border rounded-lg p-8 text-center">
            <div className="w-16 h-16 mx-auto bg-primary-10 rounded-full flex items-center justify-center mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-primary" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M5 3a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2V5a2 2 0 00-2-2H5zm0 2h10v7h-2l-1 2H8l-1-2H5V5z" clipRule="evenodd" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold mb-2">No workspaces found</h3>
            <p className="text-text-secondary mb-6">
              {searchQuery 
                ? `No workspaces match "${searchQuery}"`
                : "You don't have any workspaces yet. Create your first workspace to get started."}
            </p>
            <button 
              onClick={() => setIsCreateModalOpen(true)}
              className="btn btn-primary"
            >
              Create New Workspace
            </button>
          </div>
        )}

        {/* Workspaces Grid */}
        {!isLoading && filteredWorkspaces.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredWorkspaces.map((workspace) => (
              <Link 
                key={workspace.uuid} 
                href={`/workspace/${workspace.uuid}`}
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
                      <span>{workspace.description || 'No description'}</span>
                    </div>
                    <div className="flex justify-between mt-2 text-sm text-text-secondary">
                      <span>Last: {formatDate(workspace.updated_at)}</span>
                      <span>{workspace.user_role}</span>
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
        )}
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
              
              {errors.form && (
                <div className="bg-error-10 text-error p-3 rounded-md text-sm mb-4">
                  {errors.form}
                </div>
              )}
              
              <form onSubmit={handleCreateWorkspace}>
                <div className="mb-4">
                  <label htmlFor="name" className="input-label">
                    Workspace Name
                  </label>
                  <input
                    id="name"
                    name="name"
                    type="text"
                    className={`input w-full ${errors.name ? 'input-error' : ''}`}
                    placeholder="Enter workspace name"
                    value={newWorkspaceData.name}
                    onChange={handleChange}
                    required
                  />
                  {errors.name && (
                    <p className="error-message">{errors.name}</p>
                  )}
                </div>
                
                <div className="mb-4">
                  <label htmlFor="description" className="input-label">
                    Description (Optional)
                  </label>
                  <textarea
                    id="description"
                    name="description"
                    className="input w-full h-20"
                    placeholder="Enter workspace description"
                    value={newWorkspaceData.description}
                    onChange={handleChange}
                  />
                </div>
                
                <div className="mb-4">
                  <div className="flex items-center">
                    <input
                      id="isPublic"
                      name="isPublic"
                      type="checkbox"
                      className="h-4 w-4 text-primary border-border rounded focus:ring-primary"
                      checked={newWorkspaceData.isPublic}
                      onChange={handleChange}
                    />
                    <label htmlFor="isPublic" className="ml-2 block text-sm text-text">
                      Make this workspace public
                    </label>
                  </div>
                  <p className="text-xs text-text-secondary mt-1">
                    Public workspaces can be discovered by anyone with the link.
                  </p>
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
                    disabled={!newWorkspaceData.name.trim() || isCreating}
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
                      'Create Workspace'
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