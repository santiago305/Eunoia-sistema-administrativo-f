export const NOTIFICATION_SOCKET_EVENTS = {
  created: 'notification.created',
  messageCreated: 'message.created',
  actionUpdated: 'mail.action.updated',
} as const;

export const NOTIFICATION_WINDOW_EVENTS = {
  messagesRefresh: 'notifications:messages-refresh',
  mailMessageCreated: 'mail:message-created',
  mailActionUpdated: 'mail:action-updated',
  systemNotificationCreated: 'system-notification:created',
  mailUnreadSync: 'notifications:mail-unread-sync',
  mailUnreadStateChanged: 'notifications:mail-unread-state-changed',
} as const;
