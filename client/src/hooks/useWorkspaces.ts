import { useQuery, useMutation, useQueryClient } from 'react-query';
import { workspacesApi, Workspace } from '@/services/api';
import { AxiosError } from 'axios';

export function useWorkspaces() {
  const queryClient = useQueryClient();
  
  // Get all workspaces
  const { data, isLoading, error, refetch } = useQuery(
    'workspaces',
    async () => {
      const response = await workspacesApi.getAll();
      return response.data.data.workspaces;
    },
    {
      staleTime: 5 * 60 * 1000, // 5 minutes
      retry: 1,
    }
  );
  
  // Create workspace mutation
  const createWorkspaceMutation = useMutation(
    async (workspaceData: { name: string; description?: string; isPublic?: boolean; defaultPermission?: string }) => {
      const response = await workspacesApi.create(workspaceData);
      return response.data.data.workspace;
    },
    {
      onSuccess: (newWorkspace) => {
        // Update the workspaces cache with the new workspace
        queryClient.setQueryData<Workspace[]>('workspaces', (oldWorkspaces = []) => {
          return [...oldWorkspaces, newWorkspace];
        });
      },
    }
  );
  
  // Delete workspace mutation
  const deleteWorkspaceMutation = useMutation(
    async (workspaceId: string) => {
      await workspacesApi.delete(workspaceId);
      return workspaceId;
    },
    {
      onSuccess: (deletedWorkspaceId) => {
        // Remove the deleted workspace from the cache
        queryClient.setQueryData<Workspace[]>('workspaces', (oldWorkspaces = []) => {
          return oldWorkspaces.filter(workspace => workspace.uuid !== deletedWorkspaceId);
        });
      },
    }
  );
  
  // Update workspace mutation
  const updateWorkspaceMutation = useMutation(
    async ({ id, data }: { id: string; data: { name?: string; description?: string; isPublic?: boolean; defaultPermission?: string } }) => {
      const response = await workspacesApi.update(id, data);
      return response.data.data.workspace;
    },
    {
      onSuccess: (updatedWorkspace) => {
        // Update the workspace in the cache
        queryClient.setQueryData<Workspace[]>('workspaces', (oldWorkspaces = []) => {
          return oldWorkspaces.map(workspace => 
            workspace.uuid === updatedWorkspace.uuid ? updatedWorkspace : workspace
          );
        });
      },
    }
  );
  
  return {
    workspaces: data || [],
    isLoading,
    error: error as AxiosError | null,
    refetch,
    createWorkspace: createWorkspaceMutation.mutateAsync,
    isCreating: createWorkspaceMutation.isLoading,
    createError: createWorkspaceMutation.error as AxiosError | null,
    deleteWorkspace: deleteWorkspaceMutation.mutateAsync,
    isDeleting: deleteWorkspaceMutation.isLoading,
    deleteError: deleteWorkspaceMutation.error as AxiosError | null,
    updateWorkspace: updateWorkspaceMutation.mutateAsync,
    isUpdating: updateWorkspaceMutation.isLoading,
    updateError: updateWorkspaceMutation.error as AxiosError | null,
  };
}