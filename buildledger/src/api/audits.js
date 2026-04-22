import api from './axios';

export const getAllAudits       = ()           => api.get('/audits');
export const getAuditById      = (id)          => api.get(`/audits/${id}`);
export const createAudit       = (data)        => api.post('/audits', data);
export const updateAudit       = (id, data)    => api.put(`/audits/${id}`, data);
export const deleteAudit       = (id)          => api.delete(`/audits/${id}`);
export const updateAuditStatus = (id, status)  => api.patch(`/audits/${id}/status`, { status });
export const getAuditsByOfficer = (officerId)  => api.get(`/audits/officer/${officerId}`);

