import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const authAPI = {
  login: (email: string, password: string) =>
    api.post('/auth/login', { email, password }),
  
  signup: (data: any) =>
    api.post('/auth/signup', data),
};

export const competitionsAPI = {
  getAll: () => api.get('/competitions'),
  create: (data: any) => api.post('/competitions', data),
  register: (id: string) => api.post(`/competitions/${id}/register`),
  getMyRegistrations: () => api.get('/competitions/my-registrations'),
};

export default api;