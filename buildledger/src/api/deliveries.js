import api from './axios';

export const getAllDeliveries       = ()            => api.get('/deliveries');
export const getDeliveryById       = (id)           => api.get(`/deliveries/${id}`);
export const createDelivery        = (data)         => api.post('/deliveries', data);
export const updateDelivery        = (id, data)     => api.put(`/deliveries/${id}`, data);
export const deleteDelivery        = (id)           => api.delete(`/deliveries/${id}`);
export const updateDeliveryStatus  = (id, status)   => api.patch(`/deliveries/${id}/status`, { status });
export const getDeliveriesByContract = (contractId) => api.get(`/deliveries/contract/${contractId}`);

