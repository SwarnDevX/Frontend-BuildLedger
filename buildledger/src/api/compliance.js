import api from './axios';

export const getAllCompliance        = ()              => api.get('/compliance');
export const getComplianceById      = (id)             => api.get(`/compliance/${id}`);
export const createCompliance       = (data)           => api.post('/compliance', data);
export const updateCompliance       = (id, data)       => api.put(`/compliance/${id}`, data);
export const deleteCompliance       = (id)             => api.delete(`/compliance/${id}`);
export const updateComplianceStatus = (id, status)     => api.patch(`/compliance/${id}/status`, { status });
export const getComplianceByStatus  = (status)         => api.get(`/compliance/status/${status}`);
export const getComplianceByContract = (contractId)    => api.get(`/compliance/contract/${contractId}`);

