import api from './axios';

export const getAllServices       = ()            => api.get('/services');
export const getServiceById      = (id)           => api.get(`/services/${id}`);
export const createService       = (data)         => api.post('/services', data);
export const updateService       = (id, data)     => api.put(`/services/${id}`, data);
export const deleteService       = (id)           => api.delete(`/services/${id}`);
export const updateServiceStatus = (id, status)   => api.patch(`/services/${id}/status`, { status });
export const getServicesByContract = (contractId) => api.get(`/services/contract/${contractId}`);

