import api from './axios';

export const getAllVendors         = ()              => api.get('/vendors');
export const getVendorById        = (id)             => api.get(`/vendors/${id}`);
export const getVendorsByStatus   = (status)         => api.get(`/vendors/status/${status}`);
export const updateVendor         = (id, data)       => api.put(`/vendors/${id}`, data);
export const deleteVendor         = (id)             => api.delete(`/vendors/${id}`);

// Documents
export const getVendorDocuments   = (id)             => api.get(`/vendors/${id}/documents`);

export const uploadVendorDocument = (vendorId, file, docType) => {
  const formData = new FormData();
  formData.append('file', file);
  const type = docType || 'PAN_CARD';
  return api.post(`/vendors/${vendorId}/documents?docType=${encodeURIComponent(type)}`, formData, {
    headers: { 'Content-Type': undefined },
  });
};

export const replaceVendorDocument = (vendorId, documentId, file, docType) => {
  const formData = new FormData();
  formData.append('file', file);
  const type = docType || 'PAN_CARD';
  return api.put(`/vendors/${vendorId}/documents/replace?documentId=${documentId}&docType=${encodeURIComponent(type)}`, formData, {
    headers: { 'Content-Type': undefined },
  });
};

// Review: APPROVED or REJECTED  [PROJECT_MANAGER / ADMIN]
export const verifyDocument       = (docId, { status, reviewRemarks, username }) => {
  const params = new URLSearchParams();
  if (status) params.set('status', status);
  if (reviewRemarks) params.set('reviewRemarks', reviewRemarks);
  return api.put(`/vendors/documents/${docId}/review?${params.toString()}`, null, {
    headers: { 'X-Username': username },
  });
};
export const downloadDocument     = (docId)          => api.get(`/vendors/documents/${docId}/download`, { responseType: 'blob' });

export const downloadVendorDocument = async ({ vendorId, documentId, docType, fileUri }) => {
  const resolvedId = documentId || fileUri?.match(/(?:^|\/)(\d{1,})(?=[_\-.\/]|$)/)?.[1];
  if (!resolvedId) throw new Error('Document id not available for download');
  return downloadDocument(resolvedId);
};

export const getPendingDocuments  = ()               => api.get('/vendors/documents/pending-review');
export const getDocumentsByStatus = (status)         => api.get(`/vendors/documents/status/${status}`);

// Self-registration (PUBLIC - no auth needed)
export const registerVendor = (data) => api.post('/vendors/register', data);
