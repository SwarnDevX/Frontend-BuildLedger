import api from './axios';

export const getAllContracts        = ()              => api.get('/contracts');
export const getContractById       = (id)             => api.get(`/contracts/${id}`);
export const createContract        = (data)           => api.post('/contracts', data);
export const updateContract        = (id, data)       => api.put(`/contracts/${id}`, data);
export const deleteContract        = (id)             => api.delete(`/contracts/${id}`);
export const updateContractStatus  = (id, status, remarks) => {
  const params = new URLSearchParams({ status });
  if (remarks) params.set('remarks', remarks);
  return api.patch(`/contracts/${id}/status?${params.toString()}`);
};
export const getContractsByVendor  = (vendorId)       => api.get(`/contracts/vendor/${vendorId}`);
export const getContractsByStatus  = (status)         => api.get(`/contracts/status/${status}`);
export const getContractsByProject = (projectId)      => api.get(`/contracts/project/${projectId}`);
export const getContractTerms      = (contractId)     => api.get(`/contracts/${contractId}/terms`);
export const addContractTerm       = (contractId, d)  => api.post(`/contracts/${contractId}/terms`, d);
export const updateContractTerm    = (termId, data)   => api.put(`/contracts/terms/${termId}`, data);
export const deleteContractTerm    = (termId)         => api.delete(`/contracts/terms/${termId}`);

// Vendor-specific: accept or reject an assigned contract
export const vendorContractResponse = (id, action, vendorId, remarks) => {
  const params = new URLSearchParams({ action });
  if (remarks) params.set('remarks', remarks);
  return api.patch(`/contracts/${id}/vendor-response?${params.toString()}`, null, {
    headers: { 'X-Vendor-Id': vendorId },
  });
};

