import api from './axios';

export const getAllUsers    = ()         => api.get('/users');
export const getUserById   = (id)        => api.get(`/users/${id}`);
export const getUserByRole = (role)      => api.get(`/users/role/${role}`);
export const createUser    = (data)      => api.post('/users', data);
export const updateUser    = (id, data)  => api.put(`/users/${id}`, data);
export const deleteUser    = (id)        => api.delete(`/users/${id}`);
export const validateRole  = (id)        => api.get(`/users/${id}/validate-role`);

