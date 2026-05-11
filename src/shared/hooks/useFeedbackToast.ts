import { useCallback } from "react";
import { sileo } from "sileo";

export type FeedbackType = "error" | "success" | "warning" | "info";
export type FeedbackMessage = {
  type: FeedbackType;
  message: string;
};

export const useFeedbackToast = () => {
  const showFeedback = useCallback((msg: FeedbackMessage) => {
    const title = msg.type === "success" ? "Exito" : msg.type === "error" ? "Error" : "Aviso";
    switch (msg.type) {
      case "error":
        sileo.error({ title, description: msg.message });
        break;
      case "success":
        sileo.success({ title, description: msg.message });
        break;
      case "warning":
      case "info":
      default:
        sileo.info({ title, description: msg.message });
        break;
    }
  }, []);

  const clearFeedback = useCallback(() => {
    // no-op: feedback is transient
  }, []);

  return { feedback: null, showFeedback, clearFeedback };
};
