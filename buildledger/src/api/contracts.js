import api from './axios';

export const getAllContracts          = ()                              => api.get('/contracts');
export const getMyContracts          = ()                              => api.get('/contracts/manager/my');
// Vendor-specific — returns only contracts assigned to the logged-in vendor
// Used in DeliveryTracking so vendor can see their ACTIVE contracts in the dropdown
export const getVendorContracts      = ()                              => api.get('/contracts/vendor/my');
export const getContractById         = (id)                            => api.get(`/contracts/${id}`);
export const createContract          = (data)                          => api.post('/contracts', data);
export const updateContract          = (id, data)                      => api.put(`/contracts/${id}`, data);
export const deleteContract          = (id)                            => api.delete(`/contracts/${id}`);
export const updateContractStatus    = (id, status)                    => api.patch(`/contracts/${id}/status?status=${status}`);
export const getContractsByVendor    = (vendorId)                      => api.get(`/contracts/vendor/${vendorId}`);
export const getContractsByStatus    = (status)                        => api.get(`/contracts/status/${status}`);
export const getContractsByProject   = (projectId)                     => api.get(`/contracts/project/${projectId}`);
export const getContractTerms        = (contractId)                    => api.get(`/contracts/${contractId}/terms`);
export const addContractTerm         = (contractId, d)                 => api.post(`/contracts/${contractId}/terms`, d);
export const updateContractTerm      = (termId, data)                  => api.put(`/contracts/terms/${termId}`, data);
export const deleteContractTerm      = (termId)                        => api.delete(`/contracts/terms/${termId}`);
export const vendorRespondToContract = (contractId, action, vendorId, remarks) =>
  api.patch(`/contracts/${contractId}/respond?action=${action}&vendorId=${vendorId}${remarks ? `&remarks=${encodeURIComponent(remarks)}` : ''}`);
export const getProjectBudgetSummary = (projectId)                     => api.get(`/contracts/project/${projectId}/budget-summary`);