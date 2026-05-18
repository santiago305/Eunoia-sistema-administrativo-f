export const NOTIFICATION_SOCKET_EVENTS = {
  created: 'notification.created',
  messageCreated: 'message.created',
} as const;

export const NOTIFICATION_WINDOW_EVENTS = {
  refresh: 'notifications:refresh',
  messagesRefresh: 'notifications:messages-refresh',
  mailUnreadSync: 'notifications:mail-unread-sync',
  unreadCountUpdated: 'notifications:unread-count-updated',
} as const;
