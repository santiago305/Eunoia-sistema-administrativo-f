import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useMessageDetailV2 } from "@/features/notifications/hooks/useMessageDetailV2";
import { useAuth } from "@/shared/hooks/useAuth";
import NotificationMailDetail from "@/features/notifications/components/mail/NotificationMailDetail";

export default function NotificationDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { item, loading, markRead, reply, forward } = useMessageDetailV2(id);
  const { userId } = useAuth();
  const [replyText, setReplyText] = useState("");
  const [forwardTo, setForwardTo] = useState("");
  const [forwardText, setForwardText] = useState("");

  return (
    <NotificationMailDetail
      loading={loading}
      item={item}
      userId={userId}
      replyText={replyText}
      forwardTo={forwardTo}
      forwardText={forwardText}
      onBack={() => navigate(-1)}
      onMarkRead={() => markRead()}
      onReplyTextChange={setReplyText}
      onForwardToChange={setForwardTo}
      onForwardTextChange={setForwardText}
      onReply={async () => {
        if (!replyText.trim()) return;
        await reply({ bodyHtml: replyText });
        setReplyText("");
      }}
      onForward={async () => {
        if (!forwardTo.trim() || !forwardText.trim()) return;
        await forward({ recipients: forwardTo, bodyHtml: forwardText });
        setForwardTo("");
        setForwardText("");
      }}
    />
  );
}
