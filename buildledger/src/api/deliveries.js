import api from './axios';

export const getAllDeliveries       = ()            => api.get('/deliveries');
export const getDeliveryById       = (id)           => api.get(`/deliveries/${id}`);
export const createDelivery        = (data)         => api.post('/deliveries', data);
export const updateDelivery        = (id, data)     => api.put(`/deliveries/${id}`, data);
export const deleteDelivery        = (id)           => api.delete(`/deliveries/${id}`);
export const updateDeliveryStatus  = (id, status)   => api.patch(`/deliveries/${id}/status?status=${status}`);
export const getDeliveriesByContract  = (contractId) => api.get(`/deliveries/contract/${contractId}`);
// Contract-level budget: contractValue - sum(delivery prices) - sum(service prices)
export const getContractBudgetSummary = (contractId) => api.get(`/deliveries/contract/${contractId}/budget-summary`);
// Used by ComplianceAudit — fetches deliveries filtered by status
export const getDeliveriesByStatus   = (status)     => api.get(`/deliveries/status/${status}`);