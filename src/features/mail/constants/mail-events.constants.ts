export const NOTIFICATION_SOCKET_EVENTS = {
  created: 'notification.created',
  messageCreated: 'message.created',
} as const;

export const NOTIFICATION_WINDOW_EVENTS = {
  messagesRefresh: 'notifications:messages-refresh',
  mailMessageCreated: 'mail:message-created',
  systemNotificationCreated: 'system-notification:created',
  mailUnreadSync: 'notifications:mail-unread-sync',
  mailUnreadStateChanged: 'notifications:mail-unread-state-changed',
} as const;
