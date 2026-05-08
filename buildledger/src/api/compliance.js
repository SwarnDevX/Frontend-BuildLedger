import api from './axios';

export const getAllCompliance        = ()              => api.get('/compliance');
export const getComplianceById      = (id)             => api.get(`/compliance/${id}`);
export const createCompliance       = (data)           => api.post('/compliance', data);
export const updateCompliance       = (id, data)       => api.put(`/compliance/${id}`, data);
export const deleteCompliance       = (id)             => api.delete(`/compliance/${id}`);
export const updateComplianceStatus = (id, status, remarks) => {
  const params = new URLSearchParams({ status });
  if (remarks) params.set('remarks', remarks);
  return api.patch(`/compliance/${id}/status?${params.toString()}`);
};
export const getComplianceByStatus  = (status)         => api.get(`/compliance/status/${status}`);
export const getComplianceByContract = (contractId)    => api.get(`/compliance/contract/${contractId}`);
export const checkCompliance         = (referenceId, type) => api.get(`/compliance/check/${referenceId}`, { params: { type } });

