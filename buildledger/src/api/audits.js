import api from './axios';

export const getAllAudits       = ()           => api.get('/audits');
export const getAuditById      = (id)          => api.get(`/audits/${id}`);
export const createAudit       = (data)        => api.post('/audits', data);
export const updateAudit       = (id, data)    => api.put(`/audits/${id}`, data);
export const deleteAudit       = (id)          => api.delete(`/audits/${id}`);
export const updateAuditStatus = (id, status, findings) => {
  const params = new URLSearchParams({ status });
  if (findings) params.append('findings', findings);
  return api.patch(`/audits/${id}/status?${params.toString()}`);
};
export const getAuditsByOfficer          = (officerId)          => api.get(`/audits/officer/${officerId}`);
export const getAuditLogsByComplianceRecord = (complianceRecordId) => api.get(`/audits/compliance/${complianceRecordId}`);
export const getAuditLogById             = (logId)              => api.get(`/audits/logs/${logId}`);

