import { io, Socket } from 'socket.io-client';
import { env } from '@/env';

const resolveSocketBaseUrl = () => {
  const base = env.apiBaseUrl || '';
  if (!base) return 'http://localhost:3000';
  return base.endsWith('/api') ? base.slice(0, -4) : base;
};

let notificationSocket: Socket | null = null;
let saleOrdersSocket: Socket | null = null;

export const createNotificationSocket = (userId: string) => {
  if (!userId) return null;
  if (notificationSocket) return notificationSocket;

  notificationSocket = io(`${resolveSocketBaseUrl()}/notifications`, {
    withCredentials: true,
    transports: ['websocket'],
    auth: { userId },
  });

  return notificationSocket;
};

export const getNotificationSocket = () => notificationSocket;

export const closeNotificationSocket = () => {
  if (!notificationSocket) return;
  notificationSocket.disconnect();
  notificationSocket = null;
};

export const createSaleOrdersSocket = (userId: string) => {
  if (!userId) return null;
  if (saleOrdersSocket) return saleOrdersSocket;

  saleOrdersSocket = io(`${resolveSocketBaseUrl()}/sale-orders`, {
    withCredentials: true,
    transports: ['websocket'],
    auth: { userId },
  });

  return saleOrdersSocket;
};

export const getSaleOrdersSocket = () => saleOrdersSocket;

export const closeSaleOrdersSocket = () => {
  if (!saleOrdersSocket) return;
  saleOrdersSocket.disconnect();
  saleOrdersSocket = null;
};
