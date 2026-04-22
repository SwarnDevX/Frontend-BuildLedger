import api from './axios';

/** POST /auth/login  →  { token, ... } */
export const login = (username, password) =>
  api.post('/auth/login', { username, password });

/** GET /auth/me  →  current user info */
export const getMe = () => api.get('/auth/me');

