import api from './axios';

export const getAllUsers    = ()         => api.get('/users');
export const getUserById   = (id)        => api.get(`/users/${id}`);
export const getUserByRole = (role)      => api.get(`/users/role/${role}`);
export const createUser    = (data)      => api.post('/users', data);
export const updateUser    = (id, data)  => api.put(`/users/${id}`, data);
export const deleteUser    = (id)        => api.delete(`/users/${id}`);
export const validateRole  = (id)        => api.get(`/users/${id}/validate-role`);

export const createInternalVendorUser = ({ username, encodedPassword, name, email, phone }) => {
  const params = new URLSearchParams({ username, encodedPassword, name });
  if (email) params.set('email', email);
  if (phone) params.set('phone', phone);
  return api.post(`/users/internal/vendor?${params.toString()}`);
};

