export const NOTIFICATION_SOCKET_EVENTS = {
  created: 'notification.created',
  messageCreated: 'message.created',
  unreadCountUpdated: 'notification.unread_count_updated',
} as const;

export const NOTIFICATION_WINDOW_EVENTS = {
  refresh: 'notifications:refresh',
  messagesRefresh: 'notifications:messages-refresh',
  unreadCountUpdated: 'notifications:unread-count-updated',
} as const;
