import { useQuery, useMutation, useQueryClient } from 'react-query';
import { whiteboardsApi, workspacesApi, Whiteboard, WorkspaceDetail } from '@/services/api';
import { AxiosError } from 'axios';

export function useWhiteboards(workspaceId: string) {
  const queryClient = useQueryClient();
  
  // Get workspace details and whiteboards
  const { data, isLoading, error, refetch } = useQuery(
    ['workspace', workspaceId],
    async () => {
      const response = await whiteboardsApi.getByWorkspace(workspaceId);
      return response.data.data.whiteboards;
    },
    {
      staleTime: 5 * 60 * 1000, // 5 minutes
      retry: 1,
      enabled: !!workspaceId,
    }
  );
  
  // Create whiteboard mutation
  const createWhiteboardMutation = useMutation(
    async (whiteboardData: { name: string; tags?: string[] }) => {
      const response = await whiteboardsApi.create(workspaceId, whiteboardData);
      return response.data.data.whiteboard;
    },
    {
      onSuccess: (newWhiteboard) => {
        // Update the whiteboards cache with the new whiteboard
        queryClient.setQueryData<Whiteboard[]>(['workspace', workspaceId], (oldWhiteboards = []) => {
          return [...oldWhiteboards, newWhiteboard];
        });
      },
    }
  );
  
  // Delete whiteboard mutation
  const deleteWhiteboardMutation = useMutation(
    async (whiteboardId: string) => {
      await whiteboardsApi.delete(whiteboardId);
      return whiteboardId;
    },
    {
      onSuccess: (deletedWhiteboardId) => {
        // Remove the deleted whiteboard from the cache
        queryClient.setQueryData<Whiteboard[]>(['workspace', workspaceId], (oldWhiteboards = []) => {
          return oldWhiteboards.filter(whiteboard => whiteboard.uuid !== deletedWhiteboardId);
        });
      },
    }
  );
  
  // Update whiteboard mutation
  const updateWhiteboardMutation = useMutation(
    async ({ id, data }: { id: string; data: { name?: string; tags?: string[] } }) => {
      const response = await whiteboardsApi.update(id, data);
      return response.data.data.whiteboard;
    },
    {
      onSuccess: (updatedWhiteboard) => {
        // Update the whiteboard in the cache
        queryClient.setQueryData<Whiteboard[]>(['workspace', workspaceId], (oldWhiteboards = []) => {
          return oldWhiteboards.map(whiteboard => 
            whiteboard.uuid === updatedWhiteboard.uuid ? updatedWhiteboard : whiteboard
          );
        });
      },
    }
  );
  
  return {
    whiteboards: data || [],
    isLoading,
    error: error as AxiosError | null,
    refetch,
    createWhiteboard: createWhiteboardMutation.mutateAsync,
    isCreating: createWhiteboardMutation.isLoading,
    createError: createWhiteboardMutation.error as AxiosError | null,
    deleteWhiteboard: deleteWhiteboardMutation.mutateAsync,
    isDeleting: deleteWhiteboardMutation.isLoading,
    deleteError: deleteWhiteboardMutation.error as AxiosError | null,
    updateWhiteboard: updateWhiteboardMutation.mutateAsync,
    isUpdating: updateWhiteboardMutation.isLoading,
    updateError: updateWhiteboardMutation.error as AxiosError | null,
  };
}

export function useWorkspaceDetails(workspaceId: string) {
  // Get workspace details
  const { data, isLoading, error, refetch } = useQuery(
    ['workspaceDetails', workspaceId],
    async () => {
      const response = await workspacesApi.getById(workspaceId);
      return response.data.data.workspace;
    },
    {
      staleTime: 5 * 60 * 1000, // 5 minutes
      retry: 1,
      enabled: !!workspaceId,
    }
  );
  
  return {
    workspace: data as WorkspaceDetail | undefined,
    isLoading,
    error: error as AxiosError | null,
    refetch,
  };
}