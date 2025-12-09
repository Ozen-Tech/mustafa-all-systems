import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import apiConfig from '../config/api';
import { User, UserRole } from '../types';

const apiClient = axios.create({
  baseURL: apiConfig.BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor para adicionar token
apiClient.interceptors.request.use(
  async (config) => {
    const token = await AsyncStorage.getItem('accessToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

export interface CreateUserRequest {
  email: string;
  name: string;
  password: string;
  role: UserRole;
}

export interface UpdateUserRequest {
  email?: string;
  name?: string;
  password?: string;
  role?: UserRole;
}

export interface ListUsersResponse {
  users: User[];
}

export interface GetUserResponse {
  user: User;
}

export interface CreateUserResponse {
  user: User;
}

export interface UpdateUserResponse {
  user: User;
}

class AdminService {
  async listUsers(): Promise<User[]> {
    const response = await apiClient.get<ListUsersResponse>('/admin/users');
    return response.data.users;
  }

  async getUser(id: string): Promise<User> {
    const response = await apiClient.get<GetUserResponse>(`/admin/users/${id}`);
    return response.data.user;
  }

  async createUser(data: CreateUserRequest): Promise<User> {
    const response = await apiClient.post<CreateUserResponse>('/admin/users', data);
    return response.data.user;
  }

  async updateUser(id: string, data: UpdateUserRequest): Promise<User> {
    const response = await apiClient.put<UpdateUserResponse>(`/admin/users/${id}`, data);
    return response.data.user;
  }

  async deleteUser(id: string): Promise<void> {
    await apiClient.delete(`/admin/users/${id}`);
  }
}

export const adminService = new AdminService();

