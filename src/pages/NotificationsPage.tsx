import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { SEED_MAILS, CURRENT_USER } from "../../mail/data";
import type { Mail } from "../../mail/types";
import MailToolbar from "@/features/notifications/components/mail/MailToolbar";
import MailList from "@/features/notifications/components/mail/MailList";
import MailDetail from "@/features/notifications/components/mail/MailDetail";
import NotificationComposeModal from "@/features/notifications/components/mail/NotificationComposeModal";

type UiFolder = "inbox" | "starred" | "sent" | "drafts" | "trash" | "archived" | "snoozed";

const formatMailDate = (iso: string): string => {
  const d = new Date(iso);
  const now = new Date();
  const sameDay = d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() === now.getDate();
  if (sameDay) return d.toLocaleTimeString("es-PE", { hour: "2-digit", minute: "2-digit", hour12: false });
  const diffDays = Math.floor((+now - +d) / 86400_000);
  if (diffDays === 1) return "Ayer";
  if (diffDays < 7) return d.toLocaleDateString("es-PE", { weekday: "long" });
  return d.toLocaleDateString("es-PE", { day: "2-digit", month: "2-digit", year: "2-digit" });
};

const formatFullDate = (iso: string): string =>
  new Date(iso).toLocaleString("es-PE", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

const initialsOf = (name: string): string =>
  name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");

const avatarColor = (seed: string): string => {
  const colors = ["oklch(0.6 0.18 25)", "oklch(0.6 0.18 60)", "oklch(0.55 0.18 140)", "oklch(0.55 0.18 200)", "oklch(0.55 0.18 260)", "oklch(0.55 0.18 320)", "oklch(0.6 0.18 10)"];
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) % colors.length;
  return colors[h];
};

export default function NotificationsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const q = (searchParams.get("q") ?? "").trim().toLowerCase();

  const [folder, setFolder] = useState<UiFolder>("inbox");
  const [mails, setMails] = useState<Mail[]>(SEED_MAILS);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [page, setPage] = useState(0);
  const pageSize = 50;
  const [activeMailId, setActiveMailId] = useState<string | null>(null);

  const [composeOpen, setComposeOpen] = useState(false);
  const [composeMinimized, setComposeMinimized] = useState(false);
  const [editingDraftId, setEditingDraftId] = useState<string | null>(null);
  const [recipients, setRecipients] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [composeError, setComposeError] = useState<string | null>(null);

  useEffect(() => {
    const folderParam = (searchParams.get("folder") ?? "").toLowerCase();
    const valid: UiFolder[] = ["inbox", "starred", "sent", "drafts", "trash", "archived", "snoozed"];
    if (valid.includes(folderParam as UiFolder)) setFolder(folderParam as UiFolder);
  }, [searchParams]);

  useEffect(() => {
    if (searchParams.get("compose") === "1") {
      setComposeOpen(true);
      setComposeMinimized(false);
    }
    const activeId = (searchParams.get("id") ?? "").trim();
    setActiveMailId(activeId || null);
  }, [searchParams]);

  useEffect(() => {
    setPage(0);
    setSelectedIds(new Set());
  }, [folder, q]);

  const visible = useMemo(() => {
    let filtered = mails;
    if (folder === "starred") filtered = filtered.filter((m) => m.starred && m.folder !== "trash");
    else filtered = filtered.filter((m) => m.folder === folder);

    if (q) {
      filtered = filtered.filter(
        (m) =>
          m.subject.toLowerCase().includes(q) ||
          m.body.toLowerCase().includes(q) ||
          m.from.email.toLowerCase().includes(q) ||
          m.from.name.toLowerCase().includes(q),
      );
    }
    return [...filtered].sort((a, b) => +new Date(b.date) - +new Date(a.date));
  }, [mails, folder, q]);

  const total = visible.length;
  const start = page * pageSize;
  const end = Math.min(start + pageSize, total);
  const pageMails = visible.slice(start, end);
  const pageMailIds = pageMails.map((m) => m.id);
  const pageReadIds = pageMails.filter((m) => m.read).map((m) => m.id);
  const pageUnreadIds = pageMails.filter((m) => !m.read).map((m) => m.id);
  const pageStarredIds = pageMails.filter((m) => m.starred).map((m) => m.id);
  const pageCount = Math.max(1, Math.ceil(total / pageSize));

  const activeMail = useMemo(() => mails.find((m) => m.id === activeMailId) ?? null, [mails, activeMailId]);

  const setRead = (ids: string[], read: boolean) => {
    setMails((prev) => prev.map((m) => (ids.includes(m.id) ? { ...m, read } : m)));
    setSelectedIds(new Set());
  };

  const moveToTrash = (ids: string[]) => {
    setMails((prev) => prev.map((m) => (ids.includes(m.id) ? { ...m, folder: "trash" } : m)));
    setSelectedIds(new Set());
  };

  const resetCompose = () => {
    setRecipients("");
    setSubject("");
    setBody("");
    setEditingDraftId(null);
    setComposeOpen(false);
    setComposeMinimized(false);
    const next = new URLSearchParams(searchParams);
    next.delete("compose");
    setSearchParams(next, { replace: true });
  };

  return (
    <div className="h-full">
      <div className="grid h-full grid-cols-1 gap-4">
        <section className="flex min-h-0 flex-col overflow-hidden rounded-md border bg-background">
          <main className="flex-1 flex flex-col bg-background overflow-hidden">
            {activeMailId ? (
              <MailDetail
                mail={activeMail}
                currentUserEmail={CURRENT_USER.email}
                onBack={() => {
                  const next = new URLSearchParams(searchParams);
                  next.delete("id");
                  setSearchParams(next, { replace: true });
                  setActiveMailId(null);
                }}
                onSetRead={(id, read) => setRead([id], read)}
                onDelete={(id) => moveToTrash([id])}
                onToggleStar={(id) => setMails((prev) => prev.map((m) => (m.id === id ? { ...m, starred: !m.starred } : m)))}
                onComposePrefill={(payload) => {
                  setEditingDraftId(null);
                  setRecipients(payload.to ?? "");
                  setSubject(payload.subject ?? "");
                  setBody(payload.body ?? "");
                  setComposeOpen(true);
                  setComposeMinimized(false);
                }}
                formatFullDate={formatFullDate}
                initialsOf={initialsOf}
                avatarColor={avatarColor}
              />
            ) : (
              <>
                <MailToolbar
                  total={total}
                  start={start}
                  end={end}
                  page={page}
                  pageCount={pageCount}
                  pageMailIds={pageMailIds}
                  pageReadIds={pageReadIds}
                  pageUnreadIds={pageUnreadIds}
                  pageStarredIds={pageStarredIds}
                  selectedIds={selectedIds}
                  folder={folder}
                  onSelectVisible={(ids) => setSelectedIds(new Set(ids))}
                  onClearSelection={() => setSelectedIds(new Set())}
                  onSetReadBulk={(ids, read) => setRead(ids, read)}
                  onDeleteBulk={(ids) => moveToTrash(ids)}
                  onPrevPage={() => setPage((p) => Math.max(0, p - 1))}
                  onNextPage={() => setPage((p) => (end < total ? p + 1 : p))}
                  onRefresh={() => setMails((prev) => [...prev])}
                />
                <MailList
                  mails={pageMails}
                  selectedIds={selectedIds}
                  onOpen={(id) => {
                    const next = new URLSearchParams(searchParams);
                    next.set("id", id);
                    setSearchParams(next, { replace: true });
                    setActiveMailId(id);
                  }}
                  onToggleSelect={(id) => setSelectedIds((prev) => {
                    const next = new Set(prev);
                    if (next.has(id)) next.delete(id); else next.add(id);
                    return next;
                  })}
                  onToggleStar={(id) => setMails((prev) => prev.map((m) => (m.id === id ? { ...m, starred: !m.starred } : m)))}
                  onSetRead={(id, read) => setRead([id], read)}
                  onDelete={(id) => moveToTrash([id])}
                  onArchive={(id) => setMails((prev) => prev.map((m) => (m.id === id ? { ...m, folder: "archived" } : m)))}
                  onSnooze={(id) => setMails((prev) => prev.map((m) => (m.id === id ? { ...m, folder: "snoozed" } : m)))}
                  formatMailDate={formatMailDate}
                  initialsOf={initialsOf}
                  avatarColor={avatarColor}
                />
              </>
            )}
          </main>
        </section>
      </div>

      <NotificationComposeModal
        open={composeOpen}
        minimized={composeMinimized}
        editingDraft={Boolean(editingDraftId)}
        recipients={recipients}
        subject={subject}
        body={body}
        error={composeError ?? undefined}
        onToggleMinimize={() => setComposeMinimized((prev) => !prev)}
        onClose={resetCompose}
        onRecipientsChange={setRecipients}
        onSubjectChange={setSubject}
        onBodyChange={setBody}
        onSend={async () => {
          if (!recipients.trim() || !subject.trim() || !body.trim()) {
            setComposeError("Completa destinatarios, asunto y cuerpo.");
            return;
          }
          setComposeError(null);
          setMails((prev) => {
            const id = `sent-${Date.now()}`;
            const to = recipients.split(",").map((email) => ({ name: email.trim(), email: email.trim() })).filter((item) => item.email);
            return [{ id, from: { name: CURRENT_USER.name, email: CURRENT_USER.email }, to, subject, body, preview: body.replace(/<[^>]+>/g, " ").trim().slice(0, 110), date: new Date().toISOString(), read: true, starred: false, folder: "sent", category: "sistema" }, ...prev];
          });
          resetCompose();
        }}
        onSaveDraft={async () => {
          setComposeError(null);
          setMails((prev) => {
            const id = `draft-${Date.now()}`;
            return [{ id, from: { name: CURRENT_USER.name, email: CURRENT_USER.email }, to: [], subject, body, preview: body.replace(/<[^>]+>/g, " ").trim().slice(0, 110), date: new Date().toISOString(), read: true, starred: false, folder: "drafts", category: "sistema" }, ...prev];
          });
          resetCompose();
        }}
      />
    </div>
  );
}
