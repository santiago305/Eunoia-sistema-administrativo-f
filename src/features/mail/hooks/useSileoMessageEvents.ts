import { useEffect } from "react";
import { NOTIFICATION_WINDOW_EVENTS } from "../constants/mail-events.constants";
import type { MailActionUpdatedPayload, MessageCreatedRealtimePayload } from "../types/realtime.types";

type Input = {
  onRefreshMessages?: () => void | Promise<void>;
  onRealtimeMessageCreated?: (payload: MessageCreatedRealtimePayload) => void | Promise<void>;
  onMailActionUpdated?: (payload: MailActionUpdatedPayload) => void | Promise<void>;
};

export function useSileoMessageEvents({ onRefreshMessages, onRealtimeMessageCreated, onMailActionUpdated }: Input) {
  useEffect(() => {
    const handleRealtimeMessageCreated = (event: Event) => {
      if (!onRealtimeMessageCreated) return;
      const customEvent = event as CustomEvent<MessageCreatedRealtimePayload>;
      if (!customEvent.detail) return;
      void onRealtimeMessageCreated(customEvent.detail);
    };
    const handleActionUpdated = (event: Event) => {
      if (!onMailActionUpdated) return;
      const customEvent = event as CustomEvent<MailActionUpdatedPayload>;
      if (!customEvent.detail) return;
      void onMailActionUpdated(customEvent.detail);
    };
    const handleRefresh = () => {
      if (!onRefreshMessages) return;
      void onRefreshMessages();
    };

    window.addEventListener(NOTIFICATION_WINDOW_EVENTS.mailMessageCreated, handleRealtimeMessageCreated as EventListener);
    window.addEventListener(NOTIFICATION_WINDOW_EVENTS.mailActionUpdated, handleActionUpdated as EventListener);
    window.addEventListener(NOTIFICATION_WINDOW_EVENTS.messagesRefresh, handleRefresh);

    return () => {
      window.removeEventListener(NOTIFICATION_WINDOW_EVENTS.mailMessageCreated, handleRealtimeMessageCreated as EventListener);
      window.removeEventListener(NOTIFICATION_WINDOW_EVENTS.mailActionUpdated, handleActionUpdated as EventListener);
      window.removeEventListener(NOTIFICATION_WINDOW_EVENTS.messagesRefresh, handleRefresh);
    };
  }, [onRefreshMessages, onRealtimeMessageCreated, onMailActionUpdated]);
}
