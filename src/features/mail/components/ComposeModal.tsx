import { useState, useRef, useEffect } from "react";
import type { KeyboardEvent } from "react";
import {
  Check,
  Bookmark,
  X,
  Minus,
  Maximize2,
  Trash2,
  Paperclip,
  Link as LinkIcon,
  Type,
  Send,
  Image as ImageIcon,
} from "lucide-react";
import {
  RiAlignCenter,
  RiAlignLeft,
  RiAlignRight,
  RiBold,
  RiBrush3Line,
  RiEraserLine,
  RiFontSize,
  RiItalic,
  RiListOrdered,
  RiListUnordered,
  RiUnderline,
} from "react-icons/ri";
import { cn } from "@/shared/lib/utils";
import { isAxiosError } from "axios";
import { EditorContent, useEditor } from "@tiptap/react";
import { getMarkRange } from "@tiptap/core";
import type { JSONContent } from "@tiptap/core";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import TiptapImage from "@tiptap/extension-image";
import Underline from "@tiptap/extension-underline";
import TextStyle from "@tiptap/extension-text-style";
import Color from "@tiptap/extension-color";
import TextAlign from "@tiptap/extension-text-align";
import type { MailLabelItem } from "../types/message.types";
import { SystemButton } from "../../../shared/components/components/SystemButton";
import { FloatingInput } from "../../../shared/components/components/FloatingInput";
import { Popover } from "@/shared/components/modales/Popover";

type AttachmentItem = {
  id: string;
  serverId?: string;
  name: string;
  sizeLabel: string;
  kind: "image" | "file";
  previewUrl?: string;
  file: File;
  uploading?: boolean;
  uploadError?: string | null;
};

type BackendErrorPayload = {
  message?: string | string[];
};

type RecipientField = "to" | "cc" | "bcc";

export type NotificationComposeDraft = {
  id: string;
  minimized: boolean;
  editingDraftId: string | null;
  mode: "new" | "reply" | "forward";
  parentMessageId: string | null;
  to: string;
  cc: string;
  bcc: string;
  subject: string;
  body: string;
  bodyJson?: Record<string, unknown> | null;
  error: string | null;
  selectedLabelIds: string[];
  attachmentIds?: string[];
};

interface Props {
  draft: NotificationComposeDraft;
  labels?: MailLabelItem[];
  isSaving?: boolean;
  isSending?: boolean;
  isDiscarding?: boolean;
  onToggleMinimize: (composeId: string) => void;
  onClose: (composeId: string) => void;
  onToChange: (composeId: string, value: string) => void;
  onCcChange: (composeId: string, value: string) => void;
  onBccChange: (composeId: string, value: string) => void;
  onSubjectChange: (composeId: string, value: string) => void;
  onBodyChange: (
    composeId: string,
    value: string,
    bodyJson: Record<string, unknown> | null,
    bodyText: string,
  ) => void;
  onToggleLabel: (composeId: string, labelId: string) => void;
  onResolveDraftId: (composeId: string) => Promise<string>;
  onAttachmentUploaded: (composeId: string, attachmentId: string) => void;
  onAttachmentRemoved: (composeId: string, attachmentId: string) => void;
  onUploadAttachment: (input: {
    composeId: string;
    file: File;
    draftId: string;
  }) => Promise<{ id: string }>;
  onDeleteAttachment: (attachmentId: string) => Promise<void>;
  onDiscard: (composeId: string) => void | Promise<void>;
  onSend: (
    composeId: string,
    overrides?: Partial<
      Pick<
        NotificationComposeDraft,
        "to" | "cc" | "bcc" | "subject" | "body" | "selectedLabelIds"
      > & {
        attachmentIds?: string[];
        bodyJson?: Record<string, unknown> | null;
      }
    >,
  ) => void | Promise<void>;
}

export default function NotificationComposeModal({
  draft,
  labels,
  isSaving = false,
  isSending = false,
  isDiscarding = false,
  onToggleMinimize,
  onClose,
  onToChange,
  onCcChange,
  onBccChange,
  onSubjectChange,
  onBodyChange,
  onToggleLabel,
  onResolveDraftId,
  onAttachmentUploaded,
  onAttachmentRemoved,
  onUploadAttachment,
  onDeleteAttachment,
  onDiscard,
  onSend,
}: Props) {
  const isBusy = isSaving || isSending || isDiscarding;
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const toInputRef = useRef<HTMLInputElement>(null);
  const ccInputRef = useRef<HTMLInputElement>(null);
  const bccInputRef = useRef<HTMLInputElement>(null);
  const linkAnchorRef = useRef<HTMLButtonElement | null>(null);
  const formatAnchorRef = useRef<HTMLButtonElement | null>(null);
  const labelsAnchorRef = useRef<HTMLButtonElement | null>(null);
  const attachmentsRef = useRef<AttachmentItem[]>([]);
  const bodyChangeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latestBodyRef = useRef<{
    html: string;
    json: Record<string, unknown> | null;
    text: string;
  } | null>(null);
  const lastSyncedBodyRef = useRef<string>(draft.body || "");

  const [showFormat, setShowFormat] = useState(false);
  const [showLink, setShowLink] = useState(false);
  const [showLabels, setShowLabels] = useState(false);
  const [showCc, setShowCc] = useState(Boolean(draft.cc.trim()));
  const [showBcc, setShowBcc] = useState(Boolean(draft.bcc.trim()));
  const [linkName, setLinkName] = useState("");
  const [linkUrl, setLinkUrl] = useState("");
  const [validationError, setValidationError] = useState("");
  const [recipientDrafts, setRecipientDrafts] = useState<
    Record<RecipientField, string>
  >({
    to: "",
    cc: "",
    bcc: "",
  });
  const [recipientTokens, setRecipientTokens] = useState<
    Record<RecipientField, string[]>
  >({
    to: [],
    cc: [],
    bcc: [],
  });
  const [attachments, setAttachments] = useState<AttachmentItem[]>([]);
  const allowedAttachmentExtensions = useRef(
    new Set(["pdf", "jpg", "jpeg", "png", "doc", "docx", "xls", "xlsx", "txt"]),
  );
  const allowedAttachmentMimeTypes = useRef(
    new Set([
      "application/pdf",
      "image/jpeg",
      "image/png",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "application/vnd.ms-excel",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "text/plain",
    ]),
  );
  const maxAttachmentSizeBytes = 20 * 1024 * 1024;

  useEffect(() => {
    setRecipientTokens((prev) => ({
      ...prev,
      to: draft.to
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean),
    }));
  }, [draft.to]);

  useEffect(() => {
    setRecipientTokens((prev) => ({
      ...prev,
      cc: draft.cc
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean),
    }));
    if (draft.cc.trim()) setShowCc(true);
  }, [draft.cc]);

  useEffect(() => {
    setRecipientTokens((prev) => ({
      ...prev,
      bcc: draft.bcc
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean),
    }));
    if (draft.bcc.trim()) setShowBcc(true);
  }, [draft.bcc]);

  useEffect(() => {
    attachmentsRef.current = attachments;
  }, [attachments]);

  useEffect(() => {
    return () => {
      attachmentsRef.current.forEach((item) => {
        if (item.previewUrl) URL.revokeObjectURL(item.previewUrl);
      });
    };
  }, []);

  useEffect(() => {
    return () => {
      if (bodyChangeTimeoutRef.current) {
        clearTimeout(bodyChangeTimeoutRef.current);
      }
    };
  }, []);

  const scheduleBodyChange = (
    html: string,
    json: Record<string, unknown> | null,
    text: string,
  ) => {
    latestBodyRef.current = { html, json, text };

    if (bodyChangeTimeoutRef.current) {
      clearTimeout(bodyChangeTimeoutRef.current);
    }

    bodyChangeTimeoutRef.current = setTimeout(() => {
      const latest = latestBodyRef.current;
      if (!latest) return;

      lastSyncedBodyRef.current = latest.html;
      onBodyChange(draft.id, latest.html, latest.json, latest.text);
      bodyChangeTimeoutRef.current = null;
    }, 250);
  };

  const flushBodyChange = () => {
    if (bodyChangeTimeoutRef.current) {
      clearTimeout(bodyChangeTimeoutRef.current);
      bodyChangeTimeoutRef.current = null;
    }

    const latest = latestBodyRef.current;
    if (!latest) return;

    lastSyncedBodyRef.current = latest.html;
    onBodyChange(draft.id, latest.html, latest.json, latest.text);
  };


  const deleteActiveLinkAsUnit = () => {
    if (!editor) return false;

    const { state, view } = editor;
    const { selection, schema } = state;
    const linkMark = schema.marks.link;

    if (!linkMark || !selection.empty) return false;

    const { $from } = selection;
    const directRange = getMarkRange($from, linkMark);

    if (directRange) {
      view.dispatch(
        state.tr
          .delete(directRange.from, directRange.to)
          .removeStoredMark(linkMark),
      );
      return true;
    }

    const nodeBefore = $from.nodeBefore;
    const nodeAfter = $from.nodeAfter;
    const hasLinkBefore = nodeBefore?.marks.some((mark) => mark.type === linkMark);
    const hasLinkAfter = nodeAfter?.marks.some((mark) => mark.type === linkMark);

    if (hasLinkBefore && nodeBefore) {
      view.dispatch(
        state.tr
          .delete($from.pos - nodeBefore.nodeSize, $from.pos)
          .removeStoredMark(linkMark),
      );
      return true;
    }

    if (hasLinkAfter && nodeAfter) {
      view.dispatch(
        state.tr
          .delete($from.pos, $from.pos + nodeAfter.nodeSize)
          .removeStoredMark(linkMark),
      );
      return true;
    }

    return false;
  };

  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      TextStyle,
      Color,
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      TiptapImage.configure({
        inline: true,
        allowBase64: true,
        HTMLAttributes: {
          class: "inline-block size-[50px] rounded-md border border-border object-cover align-middle",
          width: "50",
          height: "50",
        },
      }),
      Link.configure({
        openOnClick: true,
        autolink: true,
        linkOnPaste: true,
        HTMLAttributes: {
          class: "text-blue-600 underline underline-offset-2 cursor-pointer",
          target: "_blank",
          rel: "noopener noreferrer",
        },
      }),
    ],
    content: (draft.bodyJson as JSONContent | null) ?? (draft.body || ""),
    onUpdate: ({ editor: instance }) => {
      const html = instance.getHTML();
      const json = instance.getJSON() as Record<string, unknown>;
      const text = instance.getText().trim();

      scheduleBodyChange(html, json, text);
    },
    editorProps: {
      attributes: {
        class:
          "min-h-[180px] flex-1 px-4 py-3 text-sm outline-none prose prose-sm max-w-none [&_a]:text-blue-600 [&_a]:underline [&_a]:underline-offset-2 [&_img]:inline-block [&_img]:size-[50px] [&_img]:rounded-md [&_img]:border [&_img]:border-border [&_img]:object-cover [&_img]:align-middle [&_ol]:list-decimal [&_ol]:pl-6 [&_ul]:list-disc [&_ul]:pl-6 [&_li]:my-1",
      },
      handleKeyDown: (_view, event) => {
        if (event.key !== "Backspace" && event.key !== "Delete") return false;

        const deleted = deleteActiveLinkAsUnit();
        if (!deleted) return false;

        event.preventDefault();
        editor?.chain().focus().unsetLink().run();
        return true;
      },
    },
  });

  useEffect(() => {
    if (!editor) return;

    const nextBody = draft.body || "";
    const current = editor.getHTML();

    if (nextBody === lastSyncedBodyRef.current || nextBody === current) {
      return;
    }

    const nextContent =
      (draft.bodyJson as JSONContent | null) ?? nextBody;

    lastSyncedBodyRef.current = nextBody;
    editor.commands.setContent(nextContent, false);
  }, [draft.body, draft.bodyJson, editor]);

  const toSizeLabel = (size: number) =>
    `${Math.max(1, Math.round(size / 1024))} KB`;

  const getFileExtension = (fileName: string) => {
    const parts = fileName.toLowerCase().split(".");
    if (parts.length < 2) return "";
    return parts[parts.length - 1];
  };

  const validateAttachmentLocally = (file: File): string | null => {
    const ext = getFileExtension(file.name);
    if (!allowedAttachmentExtensions.current.has(ext)) {
      return "Extension no permitida.";
    }
    if (!allowedAttachmentMimeTypes.current.has(file.type)) {
      return "Tipo de archivo no permitido.";
    }
    if (file.size > maxAttachmentSizeBytes) {
      return "Archivo excede 20 MB.";
    }
    return null;
  };

  const mapAttachmentBackendError = (error: unknown): string => {
    const payloadMessage = isAxiosError<BackendErrorPayload>(error)
      ? error.response?.data?.message
      : undefined;
    const message = Array.isArray(payloadMessage) ? payloadMessage[0] : payloadMessage;
    if (!message) return "No se pudo subir.";
    if (message.includes("ATTACHMENT_EXTENSION_NOT_ALLOWED")) return "Extension no permitida.";
    if (message.includes("ATTACHMENT_MIME_NOT_ALLOWED")) return "Tipo de archivo no permitido.";
    if (message.includes("ATTACHMENT_TOO_LARGE")) return "Archivo excede 20 MB.";
    if (message.includes("ATTACHMENT_ACCESS_DENIED")) return "No tienes permisos para adjuntar aquí.";
    if (message.includes("ATTACHMENT_TARGET_REQUIRED")) return "El adjunto no tiene destino válido.";
    return "No se pudo subir.";
  };

  const addFiles = async (files: FileList | null, kind: "image" | "file") => {
    if (!files?.length) return;

    const next: AttachmentItem[] = [];

    Array.from(files).forEach((file) => {
      const isImage = kind === "image" || file.type.startsWith("image/");
      const localError = validateAttachmentLocally(file);

      next.push({
        id: `att-${Date.now()}-${Math.random().toString(36).slice(2)}`,
        name: file.name,
        sizeLabel: toSizeLabel(file.size),
        kind: isImage ? "image" : "file",
        previewUrl: isImage ? URL.createObjectURL(file) : undefined,
        file,
        uploading: !localError,
        uploadError: localError,
      });
    });

    setAttachments((prev) => [...prev, ...next]);

    if (kind === "image" && editor) {
      next
        .filter((item) => item.kind === "image" && item.previewUrl)
        .forEach((item) => {
          editor
            .chain()
            .focus()
            .setImage({ src: item.previewUrl!, alt: item.name, title: item.name })
            .insertContent(" ")
            .run();
        });

      const html = editor.getHTML();
      const json = editor.getJSON() as Record<string, unknown>;
      const bodyText = editor.getText().trim();
      latestBodyRef.current = { html, json, text: bodyText };
      flushBodyChange();
    }

    let draftId = draft.editingDraftId;
    try {
      draftId = draftId || (await onResolveDraftId(draft.id));
    } catch {
      setValidationError(
        "No se pudo crear el borrador para adjuntar archivos.",
      );
      return;
    }

    for (const item of next) {
      if (item.uploadError) continue;
      try {
        const uploaded = await onUploadAttachment({
          composeId: draft.id,
          file: item.file,
          draftId,
        });
        setAttachments((prev) =>
          prev.map((current) =>
            current.id === item.id
              ? {
                  ...current,
                  serverId: uploaded.id,
                  uploading: false,
                  uploadError: null,
                }
              : current,
          ),
        );
        onAttachmentUploaded(draft.id, uploaded.id);
      } catch (error: unknown) {
        setAttachments((prev) =>
          prev.map((current) =>
            current.id === item.id
              ? {
                  ...current,
                  uploading: false,
                  uploadError: mapAttachmentBackendError(error),
                }
              : current,
          ),
        );
      }
    }

    if (kind === "file" && fileInputRef.current)
      fileInputRef.current.value = "";
    if (kind === "image" && imageInputRef.current)
      imageInputRef.current.value = "";
  };

  const removeAttachment = async (id: string) => {
    const current = attachmentsRef.current.find((item) => item.id === id);
    if (current?.serverId) {
      try {
        await onDeleteAttachment(current.serverId);
        onAttachmentRemoved(draft.id, current.serverId);
      } catch {
        setValidationError("No se pudo eliminar el adjunto del servidor.");
      }
    }

    setAttachments((prev) => {
      const found = prev.find((item) => item.id === id);
      if (found?.previewUrl) URL.revokeObjectURL(found.previewUrl);
      return prev.filter((a) => a.id !== id);
    });
  };

  const getOnChangeByField = (field: RecipientField) => {
    if (field === "to") return onToChange;
    if (field === "cc") return onCcChange;
    return onBccChange;
  };

  const addRecipientToken = (field: RecipientField, value: string) => {
    const token = value.trim();
    if (!token) return;

    const normalized = token.toLowerCase();

    setRecipientTokens((prev) => {
      if (prev[field].some((item) => item.toLowerCase() === normalized))
        return prev;

      const nextFieldTokens = [...prev[field], token];
      getOnChangeByField(field)(draft.id, nextFieldTokens.join(","));

      return {
        ...prev,
        [field]: nextFieldTokens,
      };
    });
  };

  const removeRecipientToken = (field: RecipientField, token: string) => {
    setRecipientTokens((prev) => {
      const nextFieldTokens = prev[field].filter((item) => item !== token);
      getOnChangeByField(field)(draft.id, nextFieldTokens.join(","));

      return {
        ...prev,
        [field]: nextFieldTokens,
      };
    });
  };

  const commitDraftRecipients = (field: RecipientField) => {
    const value = recipientDrafts[field];
    if (!value.trim()) return;

    value
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean)
      .forEach((item) => addRecipientToken(field, item));

    setRecipientDrafts((prev) => ({ ...prev, [field]: "" }));
  };

  const getCommittedRecipients = (field: RecipientField) => {
    const tokens = [
      ...recipientTokens[field],
      ...recipientDrafts[field]
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean),
    ];

    return Array.from(
      new Map(tokens.map((item) => [item.toLowerCase(), item])).values(),
    );
  };

  const handleRecipientDraftChange = (field: RecipientField, value: string) => {
    if (value.includes(",")) {
      const [first, ...rest] = value.split(",");
      addRecipientToken(field, first);
      setRecipientDrafts((prev) => ({ ...prev, [field]: rest.join(",") }));
      return;
    }

    setRecipientDrafts((prev) => ({ ...prev, [field]: value }));
  };

  const handleRecipientKeyDown = (
    field: RecipientField,
    e: KeyboardEvent<HTMLInputElement>,
  ) => {
    if (e.key === "Enter" || e.key === "," || e.key === "Tab") {
      e.preventDefault();
      commitDraftRecipients(field);
      return;
    }

    if (
      e.key === "Backspace" &&
      !recipientDrafts[field] &&
      recipientTokens[field].length
    ) {
      removeRecipientToken(
        field,
        recipientTokens[field][recipientTokens[field].length - 1],
      );
    }
  };

  const handleSend = () => {
    setValidationError("");
    flushBodyChange();

    const committedTo = getCommittedRecipients("to");
    const committedCc = getCommittedRecipients("cc");
    const committedBcc = getCommittedRecipients("bcc");

    if (committedTo.length === 0) {
      setValidationError("Debe especificar al menos un destinatario");
      return;
    }

    const toValue = committedTo.join(",");
    const ccValue = committedCc.join(",");
    const bccValue = committedBcc.join(",");

    onToChange(draft.id, toValue);
    onCcChange(draft.id, ccValue);
    onBccChange(draft.id, bccValue);
    setRecipientDrafts({ to: "", cc: "", bcc: "" });

    void onSend(draft.id, {
      to: toValue,
      cc: ccValue,
      bcc: bccValue,
      body: editor?.getHTML() ?? draft.body,
      attachmentIds: draft.attachmentIds ?? [],
      bodyJson: editor?.getJSON() ?? null,
    });
  };

  const insertLink = () => {
    setValidationError("");

    if (!linkName.trim() || !linkUrl.trim()) {
      setValidationError(
        "Nombre y URL son obligatorios para insertar un enlace.",
      );
      return;
    }

    let normalizedUrl = linkUrl.trim();
    if (!/^https?:\/\//i.test(normalizedUrl))
      normalizedUrl = `https://${normalizedUrl}`;

    try {
      const parsed = new URL(normalizedUrl);

      if (!/^https?:$/.test(parsed.protocol)) {
        setValidationError("La URL debe ser http o https.");
        return;
      }

      if (!editor) return;

      const href = parsed.toString();
      const text = linkName.trim();

      editor
        .chain()
        .focus()
        .insertContent([
          {
            type: "text",
            text,
            marks: [
              {
                type: "link",
                attrs: {
                  href,
                  target: "_blank",
                  rel: "noopener noreferrer",
                },
              },
            ],
          },
          {
            type: "text",
            text: " ",
          },
        ])
        .unsetLink()
        .run();

      const html = editor.getHTML();
      const json = editor.getJSON() as Record<string, unknown>;
      const bodyText = editor.getText().trim();
      latestBodyRef.current = { html, json, text: bodyText };
      flushBodyChange();

      setLinkName("");
      setLinkUrl("");
      setShowLink(false);
    } catch {
      setValidationError("URL inválida.");
    }
  };

  const recipientFieldRef = (field: RecipientField) => {
    if (field === "to") return toInputRef;
    if (field === "cc") return ccInputRef;
    return bccInputRef;
  };

  const renderRecipientField = (
    field: RecipientField,
    label: string,
    placeholder: string,
  ) => {
    const inputRef = recipientFieldRef(field);

    return (
      <div
        className="flex min-h-10 flex-wrap items-center gap-2 border-b border-border bg-transparent px-4 py-2 text-sm"
        onClick={() => inputRef.current?.focus()}
      >
        <span className="w-10 shrink-0 text-muted-foreground">{label}</span>

        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-1.5">
          {recipientTokens[field].map((token) => (
            <span
              key={`${field}-${token}`}
              className="inline-flex max-w-full items-center gap-1 rounded-full bg-mail-surface px-2 py-1 text-xs"
            >
              <span className="truncate">{token}</span>

              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  removeRecipientToken(field, token);
                }}
                className="rounded p-0.5 hover:bg-mail-hover"
                title="Quitar correo"
              >
                <X className="size-3" />
              </button>
            </span>
          ))}

          <input
            ref={inputRef}
            type="text"
            placeholder={recipientTokens[field].length ? "" : placeholder}
            value={recipientDrafts[field]}
            onChange={(e) => handleRecipientDraftChange(field, e.target.value)}
            onBlur={() => commitDraftRecipients(field)}
            onKeyDown={(e) => handleRecipientKeyDown(field, e)}
            className="min-w-40 flex-1 border-0 bg-transparent outline-none"
          />
        </div>

        {field === "to" ? (
          <div className="ml-auto flex shrink-0 items-center gap-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            {!showCc ? (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowCc(true);
                  requestAnimationFrame(() => ccInputRef.current?.focus());
                }}
                className="underline underline-offset-2 hover:text-foreground"
              >
                CC
              </button>
            ) : null}

            {!showBcc ? (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowBcc(true);
                  requestAnimationFrame(() => bccInputRef.current?.focus());
                }}
                className="underline underline-offset-2 hover:text-foreground"
              >
                BCC
              </button>
            ) : null}
          </div>
        ) : null}
      </div>
    );
  };

  const formatButtonClass = (active?: boolean) =>
    cn(
      "flex size-8 items-center justify-center rounded-md border border-transparent text-xs transition-colors hover:border-border hover:bg-mail-hover",
      active && "border-border bg-mail-hover shadow-sm ring-1 ring-black/5",
    );

  if (draft.minimized) {
    return (
      <div
        data-compose-modal
        data-compose-id={draft.id}
        className="w-72 cursor-pointer rounded-t-lg border border-border bg-background shadow-compose"
        onClick={() => onToggleMinimize(draft.id)}
      >
        <div className="flex items-center justify-between rounded-t-lg bg-primary/5 px-3 py-2 text-mail-compose-foreground">
          <span className="truncate text-sm font-medium">
            {draft.subject || "Mensaje nuevo"}
          </span>

          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                if (isBusy) return;
                onToggleMinimize(draft.id);
              }}
              disabled={isBusy}
              className="flex size-6 items-center justify-center rounded hover:bg-black/10"
            >
              <Maximize2 className="size-3.5" />
            </button>

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                if (isBusy) return;
                onClose(draft.id);
              }}
              disabled={isBusy}
              className="flex size-6 items-center justify-center rounded hover:bg-black/10"
            >
              <X className="size-3.5" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      data-compose-modal
      data-compose-id={draft.id}
      className="flex h-150 max-h-[calc(100vh-2rem)] w-[min(540px,calc(100vw-2rem))] shrink-0 flex-col rounded-t-lg border border-border bg-background shadow-2xl"
    >
      <div className="flex items-center justify-between rounded-t-lg bg-primary/5 px-4 py-2 text-mail-compose-foreground">
        <span className="text-sm font-medium">
          {draft.editingDraftId
            ? "Editar borrador"
            : draft.mode === "reply"
              ? "Responder"
              : draft.mode === "forward"
                ? "Reenviar"
                : "Mensaje nuevo"}
        </span>

        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => {
              if (isBusy) return;
              onToggleMinimize(draft.id);
            }}
            disabled={isBusy}
            className="flex size-7 items-center justify-center rounded hover:bg-black/10"
          >
            <Minus className="size-4" />
          </button>

          <button
            type="button"
            onClick={() => {
              if (isBusy) return;
              onClose(draft.id);
            }}
            disabled={isBusy}
            className="flex size-7 items-center justify-center rounded hover:bg-black/10"
          >
            <X className="size-4" />
          </button>
        </div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col">
        {renderRecipientField("to", "Para", "")}
        {showCc ? renderRecipientField("cc", "CC", "") : null}
        {showBcc
          ? renderRecipientField("bcc", "BCC", "")
          : null}

        <input
          type="text"
          placeholder="Asunto"
          value={draft.subject}
          onChange={(e) => onSubjectChange(draft.id, e.target.value)}
          className="border-b border-border bg-transparent px-4 py-2 text-sm outline-none"
        />

        <div
          className="min-h-45 flex-1 overflow-y-auto scroll-area"
          onDrop={(e) => {
            e.preventDefault();
            void addFiles(e.dataTransfer.files, "image");
          }}
          onDragOver={(e) => e.preventDefault()}
        >
          <EditorContent editor={editor} />
        </div>

        {attachments.some((a) => a.kind === "file") ? (
          <div className="flex flex-wrap gap-3 border-t border-border px-4 py-2">
            {attachments
              .filter((a) => a.kind === "file")
              .map((a) => (
              <div
                key={a.id}
                className={cn(
                  "relative rounded-md border border-border p-2",
                  a.kind === "image"
                    ? "w-37.5"
                    : "inline-flex items-center gap-2 pr-8",
                )}
              >
                {a.kind === "image" && a.previewUrl ? (
                  <img
                    src={a.previewUrl}
                    alt={a.name}
                    className="h-37.5 w-37.5 rounded object-cover"
                  />
                ) : (
                  <>
                    <a href="#" className="text-xs text-mail-accent underline">
                      {a.name}
                    </a>

                    <span className="text-xs text-muted-foreground">
                      {a.sizeLabel}
                    </span>
                  </>
                )}

                {a.uploading ? (
                  <span className="absolute bottom-1 left-2 rounded bg-background/80 px-1.5 py-0.5 text-[10px] text-muted-foreground">
                    Subiendo...
                  </span>
                ) : null}

                {a.uploadError ? (
                  <span className="absolute bottom-1 left-2 rounded bg-destructive/10 px-1.5 py-0.5 text-[10px] text-destructive">
                    {a.uploadError}
                  </span>
                ) : null}

                <button
                  type="button"
                  onClick={() => void removeAttachment(a.id)}
                  className="absolute right-1 top-1 rounded-full p-0.5 hover:bg-mail-hover"
                >
                  <X className="size-3.5" />
                </button>
              </div>
            ))}
          </div>
        ) : null}

        {validationError ? (
          <div className="bg-destructive/10 px-4 py-2 text-xs text-destructive">
            {validationError}
          </div>
        ) : null}

        {draft.error ? (
          <div className="bg-destructive/10 px-4 py-2 text-xs text-destructive">
            {draft.error}
          </div>
        ) : null}
      </div>

      <div className="relative flex items-center gap-1 border-t border-border p-2">
        <SystemButton
          onClick={handleSend}
          leftIcon={<Send className="size-4" />}
          className="rounded-full"
          disabled={isBusy}
        >
          {isSending ? "Enviando..." : "Enviar"}
        </SystemButton>

        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="flex size-9 items-center justify-center rounded-full hover:bg-mail-hover"
          title="Adjuntar archivo"
        >
          <Paperclip className="size-5" />
        </button>

        <button
          ref={linkAnchorRef}
          type="button"
          onClick={() => {
            setShowLink((v) => !v);
            setShowFormat(false);
            setShowLabels(false);
          }}
          className={cn(
            "flex size-9 items-center justify-center rounded-full hover:bg-mail-hover",
            showLink && "bg-mail-hover",
          )}
          title="Insertar enlace"
        >
          <LinkIcon className="size-5" />
        </button>

        <Popover
          open={showLink}
          onClose={() => setShowLink(false)}
          anchorRef={linkAnchorRef}
          placement="top-start"
          offset={8}
          zIndex={10000}
          hideHeader
          className="w-72 rounded-lg border border-border bg-popover shadow-popover"
          bodyClassName="p-3"
        >
          <div className="flex flex-col gap-2">
            <p className="text-xs font-medium">Insertar enlace</p>

            <FloatingInput
              label="Texto"
              name="linkText"
              value={linkName}
              onChange={(e) => setLinkName(e.target.value)}
            />

            <FloatingInput
              label="URL"
              name="linkUrl"
              value={linkUrl}
              onChange={(e) => setLinkUrl(e.target.value)}
            />

            <div className="flex justify-end gap-2">
              <SystemButton
                variant="ghost"
                size="sm"
                onClick={() => setShowLink(false)}
              >
                Cancelar
              </SystemButton>

              <SystemButton
                size="sm"
                onClick={insertLink}
              >
                Aceptar
              </SystemButton>
            </div>
          </div>
        </Popover>

        <button
          ref={formatAnchorRef}
          type="button"
          onClick={() => {
            setShowFormat((v) => !v);
            setShowLink(false);
            setShowLabels(false);
          }}
          className={cn(
            "flex size-9 items-center justify-center rounded-full hover:bg-mail-hover",
            showFormat && "bg-mail-hover ring-1 ring-border",
          )}
          title="Formato de texto"
        >
          <Type className="size-5" />
        </button>

        <Popover
          open={showFormat}
          onClose={() => setShowFormat(false)}
          anchorRef={formatAnchorRef}
          placement="top-start"
          offset={8}
          zIndex={10000}
          hideHeader
          className="w-85 rounded-xl border border-border bg-popover shadow-popover"
          bodyClassName="p-2"
        >
          <div>
            <div className="mb-2 flex items-center justify-between border-b border-border pb-2">
              <span className="px-1 text-xs font-semibold text-muted-foreground">
                Formato
              </span>

              <button
                type="button"
                onClick={() =>
                  editor?.chain().focus().unsetAllMarks().clearNodes().run()
                }
                className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-muted-foreground hover:bg-mail-hover hover:text-foreground"
              >
                <RiEraserLine className="size-3.5" />
                Limpiar
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-1.5">
              <div className="flex h-8 items-center gap-1 rounded-md border border-border bg-background px-2 hover:bg-mail-hover">
                <RiFontSize className="size-4 text-muted-foreground" />
                <select
                  onChange={(e) => {
                    if (!editor) return;
                    const size = e.target.value;
                    if (size === "1")
                      editor
                        .chain()
                        .focus()
                        .setMark("textStyle", { fontSize: "0.8em" })
                        .run();
                    if (size === "3")
                      editor
                        .chain()
                        .focus()
                        .setMark("textStyle", { fontSize: "1em" })
                        .run();
                    if (size === "5")
                      editor
                        .chain()
                        .focus()
                        .setMark("textStyle", { fontSize: "1.2em" })
                        .run();
                    if (size === "7")
                      editor
                        .chain()
                        .focus()
                        .setMark("textStyle", { fontSize: "1.4em" })
                        .run();
                  }}
                  defaultValue="3"
                  className="h-full border-0 bg-transparent text-xs outline-none"
                >
                  <option value="1">Pequeño</option>
                  <option value="3">Normal</option>
                  <option value="5">Grande</option>
                  <option value="7">Enorme</option>
                </select>
              </div>

                <button
                  type="button"
                  onClick={() => editor?.chain().focus().toggleBold().run()}
                  className={cn(
                    formatButtonClass(editor?.isActive("bold")),
                    "font-bold",
                  )}
                  title="Negrita"
                >
                  <RiBold className="size-4" />
                </button>

                <button
                  type="button"
                  onClick={() => editor?.chain().focus().toggleItalic().run()}
                  className={cn(
                    formatButtonClass(editor?.isActive("italic")),
                    "italic",
                  )}
                  title="Cursiva"
                >
                  <RiItalic className="size-4" />
                </button>

                <button
                  type="button"
                  onClick={() =>
                    editor?.chain().focus().toggleUnderline().run()
                  }
                  className={cn(
                    formatButtonClass(editor?.isActive("underline")),
                    "underline",
                  )}
                  title="Subrayado"
                >
                  <RiUnderline className="size-4" />
                </button>

                <label
                  className="flex size-8 cursor-pointer items-center justify-center rounded-md border border-transparent hover:border-border hover:bg-mail-hover"
                  title="Color"
                >
                  <RiBrush3Line className="size-4" />
                  <input
                    type="color"
                    onChange={(e) =>
                      editor?.chain().focus().setColor(e.target.value).run()
                    }
                    className="sr-only"
                  />
                </label>

                <span className="mx-0.5 h-6 w-px bg-border" />

                <button
                  type="button"
                  onClick={() =>
                    editor?.chain().focus().setTextAlign("left").run()
                  }
                  className={formatButtonClass(
                    editor?.isActive({ textAlign: "left" }),
                  )}
                  title="Alinear izquierda"
                >
                  <RiAlignLeft className="size-4" />
                </button>

                <button
                  type="button"
                  onClick={() =>
                    editor?.chain().focus().setTextAlign("center").run()
                  }
                  className={formatButtonClass(
                    editor?.isActive({ textAlign: "center" }),
                  )}
                  title="Centrar"
                >
                  <RiAlignCenter className="size-4" />
                </button>

                <button
                  type="button"
                  onClick={() =>
                    editor?.chain().focus().setTextAlign("right").run()
                  }
                  className={formatButtonClass(
                    editor?.isActive({ textAlign: "right" }),
                  )}
                  title="Alinear derecha"
                >
                  <RiAlignRight className="size-4" />
                </button>

                <span className="mx-0.5 h-6 w-px bg-border" />

                <button
                  type="button"
                  onClick={() =>
                    editor?.chain().focus().toggleBulletList().run()
                  }
                  className={formatButtonClass(editor?.isActive("bulletList"))}
                  title="Lista con viñetas"
                >
                  <RiListUnordered className="size-4" />
                </button>

                <button
                  type="button"
                  onClick={() =>
                    editor?.chain().focus().toggleOrderedList().run()
                  }
                  className={formatButtonClass(editor?.isActive("orderedList"))}
                  title="Lista numerada"
                >
                  <RiListOrdered className="size-4" />
                </button>
            </div>
          </div>
        </Popover>

        <button
          type="button"
          onClick={() => imageInputRef.current?.click()}
          className="flex size-9 items-center justify-center rounded-full hover:bg-mail-hover"
          title="Insertar imagen"
        >
          <ImageIcon className="size-5" />
        </button>

        <div className="relative">
          <button
            ref={labelsAnchorRef}
            type="button"
            onClick={() => {
              setShowLabels((v) => !v);
              setShowFormat(false);
              setShowLink(false);
            }}
            className={cn(
              "flex size-9 items-center justify-center rounded-full hover:bg-mail-hover",
              showLabels && "bg-mail-hover",
            )}
            title="Etiquetas"
          >
            <Bookmark className="size-5 rotate-270" />

            {draft.selectedLabelIds.length > 0 ? (
              <span className="ml-1 text-[10px] font-semibold">
                {draft.selectedLabelIds.length}
              </span>
            ) : null}
          </button>

          <Popover
            open={showLabels}
            onClose={() => setShowLabels(false)}
            anchorRef={labelsAnchorRef}
            placement="top-start"
            offset={8}
            zIndex={10000}
            hideHeader
            className="rounded-lg border border-border bg-popover shadow-popover"
            bodyClassName="p-2 px-0"
          >
            <div className="max-h-50 overflow-y-auto pr-1">
              {(labels ?? []).length === 0 ? (
                <p className="px-2 py-2 text-xs text-muted-foreground">
                  No hay etiquetas creadas.
                </p>
              ) : (
                (labels ?? []).map((label) => {
                  const selected = draft.selectedLabelIds.includes(label.id);

                  return (
                    <button
                      key={label.id}
                      type="button"
                      onClick={() => onToggleLabel(draft.id, label.id)}
                      className={cn(
                        "flex w-full items-center justify-between gap-2 rounded-md p-1 text-left text-sm hover:bg-mail-hover",
                        selected && "bg-mail-hover",
                      )}
                    >
                      <span className="flex min-w-0 items-center gap-2">
                        <Bookmark
                          className="size-4 shrink-0 rotate-270"
                          style={{
                            color: label.color ?? "currentColor",
                            fill: label.color ?? "transparent",
                          }}
                        />

                        <span className="truncate">{label.name}</span>
                      </span>

                      {selected ? <Check className="size-4 shrink-0" /> : null}
                    </button>
                  );
                })
              )}
            </div>
          </Popover>
        </div>

        <button
          type="button"
          onClick={() => void onDiscard(draft.id)}
          disabled={isBusy}
          className="ml-auto flex size-9 items-center justify-center rounded-full hover:bg-mail-hover"
          title="Descartar borrador"
        >
          <Trash2 className="size-5" />
        </button>

        <input
          ref={fileInputRef}
          type="file"
          multiple
          className="hidden"
          onChange={(e) => {
            void addFiles(e.target.files, "file");
          }}
        />

        <input
          ref={imageInputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(e) => {
            void addFiles(e.target.files, "image");
          }}
        />
      </div>
    </div>
  );
}
