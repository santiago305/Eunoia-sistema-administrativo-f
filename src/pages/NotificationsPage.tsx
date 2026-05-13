import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { SEED_MAILS, CURRENT_USER } from "../../mail/data";
import type { Mail } from "../../mail/types";
import MailToolbar from "@/features/notifications/components/MailToolbar";
import MailList from "@/features/notifications/components/MailList";
import MailDetail from "@/features/notifications/components/MailDetail";
import NotificationComposeStack from "@/features/notifications/components/ComposeStack";
import type { NotificationComposeDraft } from "@/features/notifications/components/ComposeModal";
import { sendMessage } from "@/features/notifications/services/messages.service";
import { createDraft, updateDraft } from "@/features/notifications/services/drafts.service";
import { useMailLabels } from "@/features/notifications/hooks/useMailLabels";
import { usePermissions } from "@/shared/hooks/usePermissions";
import { SystemButton } from "@/shared/components/components/SystemButton";
import { FloatingInput } from "@/shared/components/components/FloatingInput";
import { Modal } from "@/shared/components/modales/Modal";

type UiFolder = "inbox" | "starred" | "sent" | "drafts" | "trash" | "archived" | "snoozed";

type ComposePayload = {
  to?: string;
  subject?: string;
  body?: string;
  editingDraftId?: string | null;
};

const MAIL_FOLDER = {
  ARCHIVED: "archived" as Mail["folder"],
  SNOOZED: "snoozed" as Mail["folder"],
} as const;

const createComposeId = () =>
  `compose-${Date.now()}-${Math.random().toString(36).slice(2)}`;
const MAX_COMPOSE_DRAFTS = 4;

const createComposeDraft = (payload?: ComposePayload): NotificationComposeDraft => ({
  id: createComposeId(),
  minimized: false,
  editingDraftId: payload?.editingDraftId ?? null,
  recipients: payload?.to ?? "",
  subject: payload?.subject ?? "",
  body: payload?.body ?? "",
  error: null,
  selectedLabelIds: [],
});

const formatMailDate = (iso: string): string => {
  const d = new Date(iso);
  const now = new Date();

  const sameDay =
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate();

  if (sameDay) {
    return d.toLocaleTimeString("es-PE", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
  }

  const diffDays = Math.floor((+now - +d) / 86400_000);

  if (diffDays === 1) return "Ayer";
  if (diffDays < 7) return d.toLocaleDateString("es-PE", { weekday: "long" });

  return d.toLocaleDateString("es-PE", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
  });
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
  const colors = [
    "oklch(0.6 0.18 25)",
    "oklch(0.6 0.18 60)",
    "oklch(0.55 0.18 140)",
    "oklch(0.55 0.18 200)",
    "oklch(0.55 0.18 260)",
    "oklch(0.55 0.18 320)",
    "oklch(0.6 0.18 10)",
  ];

  let h = 0;

  for (let i = 0; i < seed.length; i++) {
    h = (h * 31 + seed.charCodeAt(i)) % colors.length;
  }

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

  const [composeDrafts, setComposeDrafts] = useState<NotificationComposeDraft[]>([]);

  const [createLabelOpen, setCreateLabelOpen] = useState(false);
  const [newLabelName, setNewLabelName] = useState("");
  const [newLabelColor, setNewLabelColor] = useState("#2563eb");
  const [labelError, setLabelError] = useState<string | null>(null);

  const { can } = usePermissions();
  const canCreateLabel = can("notifications.labels.create");

  const { items: labels, createLabel, deleteLabel } = useMailLabels(true);

  const openCompose = useCallback((payload?: ComposePayload) => {
    setComposeDrafts((prev) => [
      ...(prev.length >= MAX_COMPOSE_DRAFTS
        ? prev
        : [
            ...prev.map((item) => ({
              ...item,
              minimized: true,
            })),
            createComposeDraft(payload),
          ]),
    ]);
  }, []);

  const updateComposeDraft = useCallback(
    (composeId: string, patch: Partial<NotificationComposeDraft>) => {
      setComposeDrafts((prev) =>
        prev.map((item) => (item.id === composeId ? { ...item, ...patch } : item)),
      );
    },
    [],
  );

  const removeComposeDraft = useCallback((composeId: string) => {
    setComposeDrafts((prev) => prev.filter((item) => item.id !== composeId));
  }, []);

  const toggleComposeMinimize = useCallback((composeId: string) => {
    setComposeDrafts((prev) => {
      const target = prev.find((item) => item.id === composeId);
      const willExpand = Boolean(target?.minimized);

      return prev.map((item) => {
        if (item.id === composeId) {
          return {
            ...item,
            minimized: !item.minimized,
          };
        }

        if (willExpand) {
          return {
            ...item,
            minimized: true,
          };
        }

        return item;
      });
    });
  }, []);

  const toggleComposeLabel = useCallback((composeId: string, labelId: string) => {
    setComposeDrafts((prev) =>
      prev.map((item) => {
        if (item.id !== composeId) return item;

        const selectedLabelIds = item.selectedLabelIds.includes(labelId)
          ? item.selectedLabelIds.filter((id) => id !== labelId)
          : [...item.selectedLabelIds, labelId];

        return {
          ...item,
          selectedLabelIds,
        };
      }),
    );
  }, []);

  const isComposeEmpty = (draft: NotificationComposeDraft) => {
    const textOnly = draft.body.replace(/<[^>]+>/g, "").trim();

    return !draft.recipients.trim() && !draft.subject.trim() && !textOnly;
  };

  const closeComposeWithDraft = async (composeId: string) => {
    const draft = composeDrafts.find((item) => item.id === composeId);

    if (!draft) return;

    removeComposeDraft(composeId);

    if (isComposeEmpty(draft)) return;

    try {
      if (draft.editingDraftId) {
        await updateDraft(draft.editingDraftId, {
          recipients: draft.recipients,
          subject: draft.subject,
          bodyHtml: draft.body,
        });
      } else {
        await createDraft({
          recipients: draft.recipients,
          subject: draft.subject,
          bodyHtml: draft.body,
          originModule: "corporate",
        });
      }
    } catch {
      // El cierre visual no se bloquea si falla el autosave.
    }
  };

  const sendCompose = async (
    composeId: string,
    overrides?: Partial<
      Pick<NotificationComposeDraft, "recipients" | "subject" | "body" | "selectedLabelIds">
    >,
  ) => {
    const currentDraft = composeDrafts.find((item) => item.id === composeId);

    if (!currentDraft) return;

    const draft = {
      ...currentDraft,
      ...overrides,
    };

    if (!draft.recipients.trim() || !draft.subject.trim() || !draft.body.trim()) {
      updateComposeDraft(composeId, {
        error: "Completa destinatarios, asunto y cuerpo.",
      });
      return;
    }

    try {
      updateComposeDraft(composeId, {
        error: null,
      });

      await sendMessage({
        recipients: draft.recipients,
        subject: draft.subject,
        bodyHtml: draft.body,
        originModule: "corporate",
        labelIds: draft.selectedLabelIds,
      });

      setMails((prev) => {
        const id = `sent-${Date.now()}`;

        const to = draft.recipients
          .split(",")
          .map((email) => ({
            name: email.trim(),
            email: email.trim(),
          }))
          .filter((item) => item.email);

        return [
          {
            id,
            from: {
              name: CURRENT_USER.name,
              email: CURRENT_USER.email,
            },
            to,
            subject: draft.subject,
            body: draft.body,
            preview: draft.body.replace(/<[^>]+>/g, " ").trim().slice(0, 110),
            date: new Date().toISOString(),
            read: true,
            starred: false,
            folder: "sent",
            category: "sistema",
          },
          ...prev,
        ];
      });

      removeComposeDraft(composeId);
    } catch (error: any) {
      const backendMessage = error?.response?.data?.message;

      updateComposeDraft(composeId, {
        error: Array.isArray(backendMessage)
          ? backendMessage[0]
          : backendMessage || "No se pudo enviar el mensaje.",
      });
    }
  };

  useEffect(() => {
    if (searchParams.get("compose") === "1") {
      openCompose();

      const next = new URLSearchParams(searchParams);

      next.delete("compose");

      setSearchParams(next, { replace: true });
    }

    if (searchParams.get("createLabel") === "1" && canCreateLabel) {
      setCreateLabelOpen(true);
    }

    const activeId = (searchParams.get("id") ?? "").trim();

    setActiveMailId(activeId || null);
  }, [canCreateLabel, openCompose, searchParams, setSearchParams]);

  useEffect(() => {
    const folderParam = (searchParams.get("folder") ?? "").toLowerCase();

    const valid: UiFolder[] = [
      "inbox",
      "starred",
      "sent",
      "drafts",
      "trash",
      "archived",
      "snoozed",
    ];

    if (valid.includes(folderParam as UiFolder)) {
      setFolder(folderParam as UiFolder);
    }
  }, [searchParams]);

  useEffect(() => {
    const labelId = (searchParams.get("deleteLabel") ?? "").trim();

    if (!labelId) return;
    if (!canCreateLabel) return;

    void (async () => {
      try {
        await deleteLabel(labelId);
      } catch {
        setLabelError("No se pudo eliminar la etiqueta.");
      } finally {
        const next = new URLSearchParams(searchParams);

        next.delete("deleteLabel");

        setSearchParams(next, { replace: true });
      }
    })();
  }, [canCreateLabel, deleteLabel, searchParams, setSearchParams]);

  useEffect(() => {
    setPage(0);
    setSelectedIds(new Set());
  }, [folder, q]);

  const visible = useMemo(() => {
    let filtered = mails;

    if (folder === "starred") {
      filtered = filtered.filter((m) => m.starred && m.folder !== "trash");
    } else {
      filtered = filtered.filter((m) => m.folder === folder);
    }

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

  const activeMail = useMemo(
    () => mails.find((m) => m.id === activeMailId) ?? null,
    [mails, activeMailId],
  );

  const moveToFolder = (ids: string[], targetFolder: Mail["folder"]) => {
    setMails((prev): Mail[] =>
      prev.map((m): Mail => (ids.includes(m.id) ? { ...m, folder: targetFolder } : m)),
    );

    setSelectedIds(new Set());
  };

  const setRead = (ids: string[], read: boolean) => {
    setMails((prev) => prev.map((m) => (ids.includes(m.id) ? { ...m, read } : m)));
    setSelectedIds(new Set());
  };

  const moveToTrash = (ids: string[]) => {
    moveToFolder(ids, "trash");
  };

  const createNewLabel = async () => {
    if (!newLabelName.trim()) {
      setLabelError("El nombre de etiqueta es obligatorio.");
      return;
    }

    try {
      setLabelError(null);

      await createLabel(newLabelName.trim(), newLabelColor);

      setNewLabelName("");
      setNewLabelColor("#2563eb");
      setCreateLabelOpen(false);

      const next = new URLSearchParams(searchParams);

      next.delete("createLabel");

      setSearchParams(next, { replace: true });
    } catch (error: any) {
      const backendMessage = error?.response?.data?.message;
      const normalized = Array.isArray(backendMessage)
        ? String(backendMessage[0] ?? "")
        : String(backendMessage ?? "");

      const normalizedUpper = normalized.toUpperCase();

      if (normalizedUpper.includes("LABEL_ALREADY_EXISTS")) {
        setLabelError("Etiqueta ya existente.");
        return;
      }

      if (
        normalizedUpper.includes("LABEL_NAME_REQUIRED") ||
        normalizedUpper.includes("LABEL_NAME_INVALID")
      ) {
        setLabelError("Nombre de etiqueta inválido.");
        return;
      }

      setLabelError("No se pudo crear la etiqueta. Intenta nuevamente.");
    }
  };

  return (
    <div className="h-full">
      <div className="grid h-full grid-cols-1 gap-4">
        <section className="flex min-h-0 flex-col overflow-hidden rounded-md border bg-background">
          <main className="flex flex-1 flex-col overflow-hidden bg-background">
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
                onToggleStar={(id) =>
                  setMails((prev) =>
                    prev.map((m) => (m.id === id ? { ...m, starred: !m.starred } : m)),
                  )
                }
                onComposePrefill={(payload) =>
                  openCompose({
                    to: payload.to,
                    subject: payload.subject,
                    body: payload.body,
                  })
                }
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
                  onToggleSelect={(id) =>
                    setSelectedIds((prev) => {
                      const next = new Set(prev);

                      if (next.has(id)) {
                        next.delete(id);
                      } else {
                        next.add(id);
                      }

                      return next;
                    })
                  }
                  onToggleStar={(id) =>
                    setMails((prev) =>
                      prev.map((m) => (m.id === id ? { ...m, starred: !m.starred } : m)),
                    )
                  }
                  onSetRead={(id, read) => setRead([id], read)}
                  onDelete={(id) => moveToTrash([id])}
                  onArchive={(id) => moveToFolder([id], MAIL_FOLDER.ARCHIVED)}
                  onSnooze={(id) => moveToFolder([id], MAIL_FOLDER.SNOOZED)}
                  formatMailDate={formatMailDate}
                  initialsOf={initialsOf}
                  avatarColor={avatarColor}
                />
              </>
            )}
          </main>
        </section>
      </div>

      <NotificationComposeStack
        drafts={composeDrafts}
        labels={labels.filter((item) => item.type === "CUSTOM" || item.type === "MODULE")}
        onToggleMinimize={toggleComposeMinimize}
        onClose={(composeId) => {
          void closeComposeWithDraft(composeId);
        }}
        onRecipientsChange={(composeId, value) =>
          updateComposeDraft(composeId, {
            recipients: value,
          })
        }
        onSubjectChange={(composeId, value) =>
          updateComposeDraft(composeId, {
            subject: value,
          })
        }
        onBodyChange={(composeId, value) =>
          updateComposeDraft(composeId, {
            body: value,
          })
        }
        onToggleLabel={toggleComposeLabel}
        onSend={sendCompose}
      />

      <Modal
        open={createLabelOpen}
        onClose={() => {
          setCreateLabelOpen(false);

          const next = new URLSearchParams(searchParams);

          next.delete("createLabel");

          setSearchParams(next, { replace: true });
        }}
        title="Crear etiqueta"
        className="w-full max-w-xs"
        bodyClassName="space-y-3 px-0"
        footer={
          <div className="flex justify-end gap-2">
            <SystemButton
              type="button"
              variant="outline"
              size="sm"
              className="rounded-sm px-3 py-1.5 text-sm"
              onClick={() => {
                setCreateLabelOpen(false);

                const next = new URLSearchParams(searchParams);

                next.delete("createLabel");

                setSearchParams(next, { replace: true });
              }}
            >
              Cancelar
            </SystemButton>

            <SystemButton
              type="button"
              variant="primary"
              size="sm"
              className="rounded-sm px-3 py-1.5 text-sm"
              onClick={() => void createNewLabel()}
            >
              Crear
            </SystemButton>
          </div>
        }
      >
        <FloatingInput
          label="Nombre de etiqueta"
          name="new-label-name"
          value={newLabelName}
          onChange={(e) => setNewLabelName(e.target.value)}
        />

        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Color</span>

          <input
            type="color"
            value={newLabelColor}
            onChange={(e) => setNewLabelColor(e.target.value)}
          />
        </div>

        {labelError ? <p className="text-xs text-destructive">{labelError}</p> : null}
      </Modal>
    </div>
  );
}
