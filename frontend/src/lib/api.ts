import axios from 'axios';
import { supabase } from './supabaseClient';

const API_BASE_URL = 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

export interface FileData {
  id: number;
  filename: string;
  filepath: string;
  category: string;
  year: string;
  month: string;
  date: string;
  description?: string;
  filesize: number;
  mimetype: string;
  created_at: string;
  updated_at: string;
}

export interface Category {
  id: number;
  name: string;
  description?: string;
  created_at: string;
  updated_at: string;
}

export interface FileStructure {
  [category: string]: {
    [year: string]: {
      [month: string]: string[];
    };
  };
}

export interface UploadFormData {
  file: File;
  category: string;
  year: string;
  month: string;
  date: string;
  description?: string;
}

// Categories API
export const getCategories = async (): Promise<Category[]> => {
  const response = await api.get('/categories');
  return response.data;
};

// Files API
export const getFilesByDate = async (
  category: string,
  year: string,
  month: string,
  date: string
): Promise<FileData[]> => {
  const response = await api.get(`/files/${category}/${year}/${month}/${date}`);
  return response.data;
};

export const uploadFile = async (formData: FormData): Promise<{ message: string; file: FileData }> => {
  const response = await api.post('/upload', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  return response.data;
};

export const deleteFile = async (fileId: number): Promise<{ message: string }> => {
  const response = await api.delete(`/files/${fileId}`);
  return response.data;
};

// Structure API
export const getFileStructure = async (): Promise<FileStructure> => {
  const response = await api.get('/structure');
  return response.data;
};

// Health check
export const healthCheck = async (): Promise<{ status: string; message: string }> => {
  const response = await api.get('/health');
  return response.data;
};

// Admin User Management API
export interface User {
  id: string;
  email: string;
  created_at: string;
  last_sign_in_at: string | null;
  email_confirmed_at: string | null;
}

export interface UserFormData {
  email: string;
  password: string;
}

// Get auth token for admin requests
const getAuthToken = async (): Promise<string | null> => {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    return session?.access_token || null;
  } catch (error) {
    console.error('Error getting auth token:', error);
    return null;
  }
};

// Get all users (admin only)
export const getUsers = async (): Promise<User[]> => {
  const token = await getAuthToken();
  const response = await api.get('/admin/users', {
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });
  return response.data;
};

// Add new user (admin only)
export const addUser = async (userData: UserFormData): Promise<{ message: string; user: User }> => {
  const token = await getAuthToken();
  const response = await api.post('/admin/users', userData, {
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });
  return response.data;
};

// Update user (admin only)
export const updateUser = async (userId: string, userData: Partial<UserFormData>): Promise<{ message: string; user: User }> => {
  const token = await getAuthToken();
  const response = await api.put(`/admin/users/${userId}`, userData, {
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });
  return response.data;
};

// Delete user (admin only)
export const deleteUser = async (userId: string): Promise<{ message: string }> => {
  const token = await getAuthToken();
  const response = await api.delete(`/admin/users/${userId}`, {
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });
  return response.data;
};

export default api; 