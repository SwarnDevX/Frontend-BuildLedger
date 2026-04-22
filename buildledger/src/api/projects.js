import api from './axios';

export const getAllProjects        = ()            => api.get('/projects');
export const getProjectById       = (id)           => api.get(`/projects/${id}`);
export const createProject        = (data)         => api.post('/projects', data);
export const updateProject        = (id, data)     => api.put(`/projects/${id}`, data);
export const deleteProject        = (id)           => api.delete(`/projects/${id}`);
export const updateProjectStatus  = (id, status)   => api.patch(`/projects/${id}/status`, { status });
export const getProjectsByManager = (managerId)    => api.get(`/projects/manager/${managerId}`);

