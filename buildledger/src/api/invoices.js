import api from './axios';

export const getAllInvoices       = ()            => api.get('/invoices');
export const getInvoiceById      = (id)           => api.get(`/invoices/${id}`);
export const createInvoice       = (data)         => api.post('/invoices', data);
export const approveInvoice      = (id)           => api.patch(`/invoices/${id}/approve`);
export const rejectInvoice       = (id, reason)   => api.patch(`/invoices/${id}/reject`, { reason });
export const deleteInvoice       = (id)           => api.delete(`/invoices/${id}`);
export const getInvoicesByStatus   = (status)     => api.get(`/invoices/status/${status}`);
export const getInvoicesByContract = (contractId) => api.get(`/invoices/contract/${contractId}`);

