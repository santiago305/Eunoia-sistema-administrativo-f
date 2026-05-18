import { useEffect } from "react";
import { NOTIFICATION_WINDOW_EVENTS } from "../constants/mail-events.constants";

type Input = {
  onRefreshMessages: () => void | Promise<void>;
};

export function useSileoMessageEvents({ onRefreshMessages }: Input) {
  useEffect(() => {
    const handleRefresh = () => {
      void onRefreshMessages();
    };

    window.addEventListener(NOTIFICATION_WINDOW_EVENTS.mailMessageCreated, handleRefresh);
    window.addEventListener(NOTIFICATION_WINDOW_EVENTS.messagesRefresh, handleRefresh);

    return () => {
      window.removeEventListener(NOTIFICATION_WINDOW_EVENTS.mailMessageCreated, handleRefresh);
      window.removeEventListener(NOTIFICATION_WINDOW_EVENTS.messagesRefresh, handleRefresh);
    };
  }, [onRefreshMessages]);
}
