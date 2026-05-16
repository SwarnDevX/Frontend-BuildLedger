import api from './axios';

// Core endpoints
export const getMyNotifications      = ()      => api.get('/notifications/my');
export const getAllNotifications      = ()      => api.get('/notifications');
export const getNotificationsByEmail = (email) => api.get(`/notifications/recipient/${email}`);
export const getPendingNotifications = ()      => api.get('/notifications/pending');

// Mark as read — multiple name variants to cover all import styles
export const markNotificationRead    = (id)    => api.patch(`/notifications/${id}/read`);
export const markNotificationAsRead  = (id)    => api.patch(`/notifications/${id}/read`);
export const markAsRead              = (id)    => api.patch(`/notifications/${id}/read`);
// Admin-only mark as read — does NOT affect recipient's read status
export const markNotificationAdminRead     = (id) => api.patch(`/notifications/${id}/admin-read`);
export const markAllNotificationsAdminRead = ()   => api.patch(`/notifications/admin-read-all`);
export const getAdminUnreadCount           = ()   => api.get(`/notifications/admin-unread-count`);

// Unread count helper
export const getUnreadCount = async () => {
  try {
    const res  = await api.get('/notifications/my');
    const list = res.data?.data ?? res.data ?? [];
    return Array.isArray(list) ? list.filter(n => !n.read).length : 0;
  } catch { return 0; }
};