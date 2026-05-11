import { useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useFeedbackToast, type FeedbackMessage } from "./useFeedbackToast";

export function useLocationFeedback() {
  const location = useLocation();
  const navigate = useNavigate();
  const { showFeedback } = useFeedbackToast();
  const hasShownFeedback = useRef(false);

  useEffect(() => {
    const state = location.state as { feedbackMessage?: FeedbackMessage } | undefined;

    if (state?.feedbackMessage && !hasShownFeedback.current) {
      showFeedback(state.feedbackMessage);
      hasShownFeedback.current = true;
      navigate(location.pathname, { replace: true, state: {} });
    } else {
      hasShownFeedback.current = false;
    }
  }, [location, navigate, showFeedback]);
}
