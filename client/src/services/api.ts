import axios, { AxiosError, AxiosRequestConfig, AxiosResponse } from 'axios';

// Create axios instance with default config
const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api',
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000,
});

// Request interceptor for adding auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor for handling errors
api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as AxiosRequestConfig & { _retry?: boolean };
    
    // Handle 401 Unauthorized errors (token expired)
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      
      try {
        // Try to refresh the token
        const refreshToken = localStorage.getItem('refreshToken');
        if (!refreshToken) {
          throw new Error('No refresh token available');
        }
        
        const response = await axios.post(`${api.defaults.baseURL}/auth/refresh`, {
          refreshToken,
        });
        
        const { token } = response.data;
        localStorage.setItem('token', token);
        
        // Retry the original request with the new token
        if (originalRequest.headers) {
          originalRequest.headers.Authorization = `Bearer ${token}`;
        }
        return api(originalRequest);
      } catch (refreshError) {
        // If refresh token is invalid, redirect to login
        localStorage.removeItem('token');
        localStorage.removeItem('refreshToken');
        window.location.href = '/login';
        return Promise.reject(refreshError);
      }
    }
    
    return Promise.reject(error);
  }
);

// Type definitions for API responses
export interface ApiResponse<T> {
  data: T;
  message?: string;
}

// Auth API
export const authApi = {
  register: (data: { name: string; email: string; password: string; avatar?: string }) => 
    api.post<ApiResponse<{ user: User; token: string }>>('/auth/register', data),
  
  login: (data: { email: string; password: string }) => 
    api.post<ApiResponse<{ user: User; token: string; refreshToken: string }>>('/auth/login', data),
  
  logout: () => 
    api.post<ApiResponse<null>>('/auth/logout'),
  
  getCurrentUser: () => 
    api.get<ApiResponse<{ user: User }>>('/auth/me'),
  
  updateProfile: (data: { name?: string; avatar?: string; preferences?: Record<string, any> }) => 
    api.put<ApiResponse<{ user: User }>>('/auth/profile', data),
  
  changePassword: (data: { currentPassword: string; newPassword: string }) => 
    api.put<ApiResponse<null>>('/auth/password', data),
};

// Workspaces API
export const workspacesApi = {
  getAll: () => 
    api.get<ApiResponse<{ workspaces: Workspace[] }>>('/workspaces'),
  
  getById: (id: string) => 
    api.get<ApiResponse<{ workspace: WorkspaceDetail; whiteboards: Whiteboard[] }>>(`/workspaces/${id}`),
  
  create: (data: { name: string; description?: string; isPublic?: boolean; defaultPermission?: string }) => 
    api.post<ApiResponse<{ workspace: Workspace }>>('/workspaces', data),
  
  update: (id: string, data: { name?: string; description?: string; isPublic?: boolean; defaultPermission?: string }) => 
    api.put<ApiResponse<{ workspace: Workspace }>>(`/workspaces/${id}`, data),
  
  delete: (id: string) => 
    api.delete<ApiResponse<null>>(`/workspaces/${id}`),
  
  addMember: (workspaceId: string, data: { email: string; role: string }) => 
    api.post<ApiResponse<{ member: WorkspaceMember }>>(`/workspaces/${workspaceId}/members`, data),
  
  updateMember: (workspaceId: string, memberId: string, data: { role: string }) => 
    api.put<ApiResponse<{ member: WorkspaceMember }>>(`/workspaces/${workspaceId}/members/${memberId}`, data),
  
  removeMember: (workspaceId: string, memberId: string) => 
    api.delete<ApiResponse<null>>(`/workspaces/${workspaceId}/members/${memberId}`),
};

// Whiteboards API
export const whiteboardsApi = {
  getByWorkspace: (workspaceId: string) => 
    api.get<ApiResponse<{ whiteboards: Whiteboard[] }>>(`/workspaces/${workspaceId}/whiteboards`),
  
  getById: (id: string) => 
    api.get<ApiResponse<{ whiteboard: WhiteboardDetail; version: WhiteboardVersion }>>(`/whiteboards/${id}`),
  
  create: (workspaceId: string, data: { name: string; tags?: string[] }) => 
    api.post<ApiResponse<{ whiteboard: Whiteboard }>>(`/workspaces/${workspaceId}/whiteboards`, data),
  
  update: (id: string, data: { name?: string; tags?: string[] }) => 
    api.put<ApiResponse<{ whiteboard: Whiteboard }>>(`/whiteboards/${id}`, data),
  
  delete: (id: string) => 
    api.delete<ApiResponse<null>>(`/whiteboards/${id}`),
  
  saveVersion: (id: string, data: { data: any; thumbnail?: string; metadata?: any }) => 
    api.post<ApiResponse<{ version: WhiteboardVersion }>>(`/whiteboards/${id}/versions`, data),
  
  getVersions: (id: string) => 
    api.get<ApiResponse<{ versions: WhiteboardVersion[] }>>(`/whiteboards/${id}/versions`),
  
  getVersion: (id: string, versionId: string) => 
    api.get<ApiResponse<{ version: WhiteboardVersion }>>(`/whiteboards/${id}/versions/${versionId}`),
  
  shareWhiteboard: (id: string, data: { accessType: string; expiresAt?: string }) => 
    api.post<ApiResponse<{ shareLink: string }>>(`/whiteboards/${id}/share`, data),
};

// Type definitions
export interface User {
  id: number;
  uuid: string;
  email: string;
  name: string;
  avatar?: string;
  preferences?: {
    theme?: string;
    language?: string;
    [key: string]: any;
  };
  lastActive?: string;
}

export interface Workspace {
  id: number;
  uuid: string;
  name: string;
  description?: string;
  owner_id: number;
  owner_name: string;
  settings: {
    isPublic: boolean;
    defaultPermission: string;
  };
  created_at: string;
  updated_at: string;
  user_role: string;
}

export interface WorkspaceDetail extends Workspace {
  members: WorkspaceMember[];
  userRole: string;
}

export interface WorkspaceMember {
  id: number;
  user_id: number;
  name: string;
  email: string;
  avatar?: string;
  role: string;
  joined_at: string;
}

export interface Whiteboard {
  id: number;
  uuid: string;
  name: string;
  workspace_id: number;
  thumbnail?: string;
  current_version: number;
  element_count: number;
  tags?: string[];
  is_archived: boolean;
  created_by: number;
  created_by_name: string;
  created_at: string;
  updated_at: string;
}

export interface WhiteboardDetail extends Whiteboard {
  workspace_name: string;
  created_by_avatar?: string;
  last_edited_by?: number;
  last_edited_by_name?: string;
}

export interface WhiteboardVersion {
  id: number;
  whiteboard_id: number;
  version: number;
  data: any;
  thumbnail?: string;
  created_by: number;
  created_by_name: string;
  created_at: string;
  metadata?: any;
}

export default api;