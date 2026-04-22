import api from './axios';

export const getAllPayments       = ()            => api.get('/payments');
export const getPaymentById      = (id)           => api.get(`/payments/${id}`);
export const processPayment      = (data)         => api.post('/payments', data);
export const updatePaymentStatus = (id, status)   => api.patch(`/payments/${id}/status`, { status });
export const getPaymentsByInvoice = (invoiceId)   => api.get(`/payments/invoice/${invoiceId}`);

