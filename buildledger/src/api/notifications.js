import api from './axios';

 
export const getMyNotifications = () => api.get('/notifications/my');

export const getAllNotifications = () => api.get('/notifications');

export const markNotificationAsRead = (id) => api.patch(`/notifications/${id}/read`);

export const getUnreadCount = () => api.get('/notifications/unread-count');
 
// export const getAllNotifications = () => api.get('/notifications');

export const getNotificationsByEmail = (email) => api.get(`/notifications/recipient/${encodeURIComponent(email)}`);

export const getPendingNotifications = () =>  api.get('/notifications/pending');
 
