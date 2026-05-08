import api from './axios';

export const getDashboardSummary     = () => api.get('/reports/dashboard');
export const getContractPageSummary  = () => api.get('/reports/contracts/summary');
export const getInvoicePageSummary   = () => api.get('/reports/invoices/summary');
export const getVendorPageSummary    = () => api.get('/reports/vendors/summary');
export const getProjectPageSummary   = () => api.get('/reports/projects/summary');
export const getDeliveryPageSummary  = () => api.get('/reports/deliveries/summary');
export const getCompliancePageSummary = () => api.get('/reports/compliance/summary');
