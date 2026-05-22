import { useEffect, useRef, useState } from "react";
import type { KeyboardEvent } from "react";
import { EditorContent, useEditor } from "@tiptap/react";
import { Extension, getMarkRange } from "@tiptap/core";
import type { JSONContent } from "@tiptap/core";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import TiptapImage from "@tiptap/extension-image";
import Underline from "@tiptap/extension-underline";
import TextStyle from "@tiptap/extension-text-style";
import Color from "@tiptap/extension-color";
import TextAlign from "@tiptap/extension-text-align";
import { Bookmark, CalendarClock, Check, Image as ImageIcon, Link as LinkIcon, Paperclip, Send, Trash2, Type, X } from "lucide-react";
import { isAxiosError } from "axios";
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
import { Popover } from "@/shared/components/modales/Popover";
import { FloatingInput } from "@/shared/components/components/FloatingInput";
import { FloatingDateTimePicker } from "@/shared/components/components/date-picker/FloatingDateTimePicker";
import { SystemButton } from "@/shared/components/components/SystemButton";
import { cn } from "@/shared/lib/utils";
import type { MailLabelItem } from "../../types/message.types";
import { MAX_MAIL_ATTACHMENT_BYTES, formatMailAttachmentSize } from "../../utils/mail-attachments.utils";

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

type SendOverrides = {
  to?: string;
  cc?: string;
  bcc?: string;
  body?: string;
  bodyJson?: Record<string, unknown> | null;
  attachmentIds?: string[];
};

type FontSizeOption = {
  value: string;
  label: string;
  fontSize: string | null;
};

const FONT_SIZE_OPTIONS: FontSizeOption[] = [
  { value: "1", label: "Pequeño", fontSize: "8px" },
  { value: "3", label: "Normal", fontSize: null },
  { value: "5", label: "Grande", fontSize: "20px" },
  { value: "7", label: "Enorme", fontSize: "25px" },
];

const FONT_SIZE_BY_VALUE = FONT_SIZE_OPTIONS.reduce<Record<string, string | null>>((acc, option) => {
  acc[option.value] = option.fontSize;
  return acc;
}, {});

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    fontSize: {
      setFontSize: (fontSize: string) => ReturnType;
      unsetFontSize: () => ReturnType;
    };
  }
}

const FontSize = Extension.create({
  name: "fontSize",

  addOptions() {
    return {
      types: ["textStyle"],
    };
  },

  addGlobalAttributes() {
    return [
      {
        types: this.options.types,
        attributes: {
          fontSize: {
            default: null,
            parseHTML: (element) => element.style.fontSize || null,
            renderHTML: (attributes) => {
              if (!attributes.fontSize) return {};
              return {
                style: `font-size: ${attributes.fontSize}`,
              };
            },
          },
        },
      },
    ];
  },

  addCommands() {
    return {
      setFontSize:
        (fontSize: string) =>
        ({ state, commands, dispatch }) => {
          if (!state.selection.empty) {
            return commands.setMark("textStyle", { fontSize });
          }

          if (!dispatch) return true;

          const markType = state.schema.marks.textStyle;
          const currentMarks = state.storedMarks ?? state.selection.$from.marks();
          const currentTextStyle = currentMarks.find((mark) => mark.type === markType);
          const otherMarks = currentMarks.filter((mark) => mark.type !== markType);

          dispatch(
            state.tr.setStoredMarks([
              ...otherMarks,
              markType.create({
                ...(currentTextStyle?.attrs ?? {}),
                fontSize,
              }),
            ]),
          );

          return true;
        },
      unsetFontSize:
        () =>
        ({ state, commands, dispatch }) => {
          if (!state.selection.empty) {
            const updated = commands.setMark("textStyle", { fontSize: null });
            commands.removeEmptyTextStyle();
            return updated;
          }

          if (!dispatch) return true;

          const markType = state.schema.marks.textStyle;
          const currentMarks = state.storedMarks ?? state.selection.$from.marks();
          const currentTextStyle = currentMarks.find((mark) => mark.type === markType);
          const otherMarks = currentMarks.filter((mark) => mark.type !== markType);
          const nextTextStyleAttrs = { ...(currentTextStyle?.attrs ?? {}) };
          delete nextTextStyleAttrs.fontSize;

          const hasRemainingTextStyleAttrs = Object.values(nextTextStyleAttrs).some(
            (value) => value !== null && value !== undefined && value !== "",
          );

          dispatch(
            state.tr.setStoredMarks(
              hasRemainingTextStyleAttrs ? [...otherMarks, markType.create(nextTextStyleAttrs)] : otherMarks,
            ),
          );

          return true;
        },
    };
  },
});

export interface MailComposerSurfaceProps {
  composeId: string;
  to: string;
  cc: string;
  bcc: string;
  subject: string;
  body: string;
  bodyJson?: Record<string, unknown> | null;
  attachmentIds?: string[];
  labels?: MailLabelItem[];
  selectedLabelIds?: string[];
  showSubject?: boolean;
  showRecipients?: boolean;
  showLabels?: boolean;
  compact?: boolean;
  isBusy?: boolean;
  isSending?: boolean;
  error?: string | null;
  onToChange: (value: string) => void;
  onCcChange: (value: string) => void;
  onBccChange: (value: string) => void;
  onSubjectChange: (value: string) => void;
  onBodyChange: (value: string, bodyJson: Record<string, unknown> | null, bodyText: string) => void;
  onToggleLabel?: (labelId: string) => void;
  onResolveDraftId: () => Promise<string>;
  onAttachmentUploaded: (attachmentId: string) => void;
  onAttachmentRemoved: (attachmentId: string) => void;
  onUploadAttachment: (input: { file: File; draftId: string; kind: "image" | "file" }) => Promise<{ id: string }>;
  onDeleteAttachment: (attachmentId: string) => Promise<void>;
  onDiscard: () => void | Promise<void>;
  onSend: (overrides?: SendOverrides) => void | Promise<void>;
  onSchedule?: (scheduledAt: string, overrides?: SendOverrides) => void | Promise<void>;
  showSchedule?: boolean;
}

const mapAttachmentBackendError = (error: unknown): string => {
  const payloadMessage = isAxiosError<BackendErrorPayload>(error) ? error.response?.data?.message : undefined;
  const message = Array.isArray(payloadMessage) ? payloadMessage[0] : payloadMessage;
  if (!message) return "No se pudo subir.";
  if (message.includes("ATTACHMENT_EXTENSION_NOT_ALLOWED")) return "El servidor no permite esta extension.";
  if (message.includes("ATTACHMENT_MIME_NOT_ALLOWED")) return "El servidor no permite este tipo de archivo.";
  if (message.includes("ATTACHMENT_TOO_LARGE")) return "El archivo no debe superar 5 MB.";
  if (message.includes("ATTACHMENT_IMAGE_MIME_REQUIRED")) return "Solo puedes insertar imagenes desde el boton de imagen.";
  if (message.includes("ATTACHMENT_ACCESS_DENIED")) return "No tienes permisos para adjuntar aqui.";
  if (message.includes("ATTACHMENT_TARGET_REQUIRED")) return "El adjunto no tiene destino valido.";
  return "No se pudo subir.";
};

export default function MailComposerSurface({
  composeId,
  to,
  cc,
  bcc,
  subject,
  body,
  bodyJson,
  attachmentIds = [],
  labels,
  selectedLabelIds = [],
  showSubject = true,
  showRecipients = true,
  showLabels = true,
  compact = false,
  isBusy = false,
  isSending = false,
  error,
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
  onSchedule,
  showSchedule = false,
}: MailComposerSurfaceProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const toInputRef = useRef<HTMLInputElement>(null);
  const ccInputRef = useRef<HTMLInputElement>(null);
  const bccInputRef = useRef<HTMLInputElement>(null);
  const linkAnchorRef = useRef<HTMLButtonElement | null>(null);
  const formatAnchorRef = useRef<HTMLButtonElement | null>(null);
  const labelsAnchorRef = useRef<HTMLButtonElement | null>(null);
  const scheduleAnchorRef = useRef<HTMLButtonElement | null>(null);
  const attachmentsRef = useRef<AttachmentItem[]>([]);
  const bodyChangeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latestBodyRef = useRef<{
    html: string;
    json: Record<string, unknown> | null;
    text: string;
  } | null>(null);
  const lastSyncedBodyRef = useRef<string>(body || "");
  const [attachments, setAttachments] = useState<AttachmentItem[]>([]);
  const [showFormat, setShowFormat] = useState(false);
  const [showLink, setShowLink] = useState(false);
  const [showLabelMenu, setShowLabelMenu] = useState(false);
  const [showCc, setShowCc] = useState(Boolean(cc.trim()));
  const [showBcc, setShowBcc] = useState(Boolean(bcc.trim()));
  const [recipientsExpanded, setRecipientsExpanded] = useState(Boolean(to.trim() || cc.trim() || bcc.trim()));
  const [recipientDrafts, setRecipientDrafts] = useState<Record<RecipientField, string>>({ to: "", cc: "", bcc: "" });
  const [recipientTokens, setRecipientTokens] = useState<Record<RecipientField, string[]>>({ to: [], cc: [], bcc: [] });
  const [linkName, setLinkName] = useState("");
  const [linkUrl, setLinkUrl] = useState("");
  const [validationError, setValidationError] = useState("");
  const [showSchedulePopover, setShowSchedulePopover] = useState(false);
  const [scheduleDateValue, setScheduleDateValue] = useState<Date | null>(null);
  const [selectedFontSize, setSelectedFontSize] = useState("3");


  const scheduleBodyChange = (html: string, json: Record<string, unknown> | null, text: string) => {
    latestBodyRef.current = { html, json, text };

    if (bodyChangeTimeoutRef.current) {
      clearTimeout(bodyChangeTimeoutRef.current);
    }

    bodyChangeTimeoutRef.current = setTimeout(() => {
      const latest = latestBodyRef.current;
      if (!latest) return;

      lastSyncedBodyRef.current = latest.html;
      onBodyChange(latest.html, latest.json, latest.text);
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
    onBodyChange(latest.html, latest.json, latest.text);
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
      view.dispatch(state.tr.delete(directRange.from, directRange.to).removeStoredMark(linkMark));
      return true;
    }

    const nodeBefore = $from.nodeBefore;
    const nodeAfter = $from.nodeAfter;
    const hasLinkBefore = nodeBefore?.marks.some((mark) => mark.type === linkMark);
    const hasLinkAfter = nodeAfter?.marks.some((mark) => mark.type === linkMark);

    if (hasLinkBefore && nodeBefore) {
      view.dispatch(state.tr.delete($from.pos - nodeBefore.nodeSize, $from.pos).removeStoredMark(linkMark));
      return true;
    }

    if (hasLinkAfter && nodeAfter) {
      view.dispatch(state.tr.delete($from.pos, $from.pos + nodeAfter.nodeSize).removeStoredMark(linkMark));
      return true;
    }

    return false;
  };

  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      TextStyle,
      FontSize,
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
    content: (bodyJson as JSONContent | null) ?? body,
    onUpdate: ({ editor: instance }) => {
      const html = instance.getHTML();
      const json = instance.getJSON() as Record<string, unknown>;
      const text = instance.getText().trim();

      scheduleBodyChange(html, json, text);
    },
    editorProps: {
      attributes: {
        class: cn(
          "flex-1 px-4 py-3 text-sm outline-none prose prose-sm max-w-none [&_a]:text-blue-600 [&_a]:underline [&_a]:underline-offset-2 [&_img]:inline-block [&_img]:size-[50px] [&_img]:rounded-md [&_img]:border [&_img]:border-border [&_img]:object-cover [&_img]:align-middle [&_ol]:list-decimal [&_ol]:pl-6 [&_ul]:list-disc [&_ul]:pl-6 [&_li]:my-1",
          compact ? "min-h-[120px]" : "min-h-[180px]",
        ),
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

  useEffect(() => {
    if (!editor) return;

    const nextBody = body || "";
    const current = editor.getHTML();

    if (nextBody === lastSyncedBodyRef.current || nextBody === current) {
      return;
    }

    const nextContent = (bodyJson as JSONContent | null) ?? nextBody;

    lastSyncedBodyRef.current = nextBody;
    editor.commands.setContent(nextContent, false);
  }, [body, bodyJson, editor]);

  useEffect(() => {
    setRecipientTokens((prev) => ({ ...prev, to: to.split(",").map((item) => item.trim()).filter(Boolean) }));
    if (to.trim()) setRecipientsExpanded(true);
  }, [to]);

  useEffect(() => {
    setRecipientTokens((prev) => ({ ...prev, cc: cc.split(",").map((item) => item.trim()).filter(Boolean) }));
    if (cc.trim()) {
      setShowCc(true);
      setRecipientsExpanded(true);
    }
  }, [cc]);

  useEffect(() => {
    setRecipientTokens((prev) => ({ ...prev, bcc: bcc.split(",").map((item) => item.trim()).filter(Boolean) }));
    if (bcc.trim()) {
      setShowBcc(true);
      setRecipientsExpanded(true);
    }
  }, [bcc]);

  const addFiles = async (files: FileList | null, kind: "image" | "file") => {
    if (!files?.length) return;

    const next = Array.from(files).map<AttachmentItem>((file) => {
      const isImageFile = file.type.startsWith("image/");
      const isInlineImage = kind === "image" && isImageFile;
      const localError =
        file.size > MAX_MAIL_ATTACHMENT_BYTES
          ? "El archivo no debe superar 5 MB."
          : kind === "image" && !isImageFile
            ? "Solo puedes insertar imagenes desde este boton."
            : null;

      return {
        id: `att-${Date.now()}-${Math.random().toString(36).slice(2)}`,
        name: file.name,
        sizeLabel: formatMailAttachmentSize(file.size),
        kind: isInlineImage ? "image" : "file",
        previewUrl: isInlineImage ? URL.createObjectURL(file) : undefined,
        file,
        uploading: !localError,
        uploadError: localError,
      };
    });

    setAttachments((prev) => [...prev, ...next]);

    if (kind === "image" && editor) {
      next
        .filter((item) => item.kind === "image" && item.previewUrl)
        .forEach((item) => {
          editor.chain().focus().setImage({ src: item.previewUrl!, alt: item.name, title: item.name }).insertContent(" ").run();
        });
      const html = editor.getHTML();
      const json = editor.getJSON() as Record<string, unknown>;
      const bodyText = editor.getText().trim();
      latestBodyRef.current = { html, json, text: bodyText };
      flushBodyChange();
    }

    let draftId = "";
    try {
      draftId = await onResolveDraftId();
    } catch {
      setValidationError("No se pudo crear el borrador para adjuntar archivos.");
      setAttachments((prev) =>
        prev.map((current) =>
          next.some((item) => item.id === current.id)
            ? { ...current, uploading: false, uploadError: "No se pudo preparar la subida." }
            : current,
        ),
      );
      return;
    }

    for (const item of next) {
      if (item.uploadError) continue;
      try {
        const uploaded = await onUploadAttachment({ file: item.file, draftId, kind: item.kind });
        setAttachments((prev) =>
          prev.map((current) => (current.id === item.id ? { ...current, serverId: uploaded.id, uploading: false, uploadError: null } : current)),
        );
        onAttachmentUploaded(uploaded.id);
      } catch (uploadError) {
        setAttachments((prev) =>
          prev.map((current) =>
            current.id === item.id ? { ...current, uploading: false, uploadError: mapAttachmentBackendError(uploadError) } : current,
          ),
        );
      }
    }
  };

  const removeAttachment = async (localId: string) => {
    const item = attachments.find((current) => current.id === localId);
    if (!item) return;
    if (item.previewUrl) URL.revokeObjectURL(item.previewUrl);
    setAttachments((prev) => prev.filter((current) => current.id !== localId));
    if (!item.serverId) return;
    onAttachmentRemoved(item.serverId);
    try {
      await onDeleteAttachment(item.serverId);
    } catch {
      setValidationError("No se pudo quitar el adjunto.");
    }
  };

  const insertLink = () => {
    setValidationError("");

    if (!linkName.trim() || !linkUrl.trim()) {
      setValidationError("Nombre y URL son obligatorios para insertar un enlace.");
      return;
    }

    let normalizedUrl = linkUrl.trim();
    if (!/^https?:\/\//i.test(normalizedUrl)) normalizedUrl = `https://${normalizedUrl}`;

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

  const getOnChangeByField = (field: RecipientField) => {
    if (field === "to") return onToChange;
    if (field === "cc") return onCcChange;
    return onBccChange;
  };

  const recipientFieldRef = (field: RecipientField) => {
    if (field === "to") return toInputRef;
    if (field === "cc") return ccInputRef;
    return bccInputRef;
  };

  const addRecipientToken = (field: RecipientField, rawValue: string) => {
    const value = rawValue.trim();
    if (!value) return;

    setRecipientTokens((prev) => {
      const exists = prev[field].some((item) => item.toLowerCase() === value.toLowerCase());
      const nextFieldTokens = exists ? prev[field] : [...prev[field], value];
      getOnChangeByField(field)(nextFieldTokens.join(","));
      return { ...prev, [field]: nextFieldTokens };
    });
  };

  const removeRecipientToken = (field: RecipientField, token: string) => {
    setRecipientTokens((prev) => {
      const nextFieldTokens = prev[field].filter((item) => item !== token);
      getOnChangeByField(field)(nextFieldTokens.join(","));
      return { ...prev, [field]: nextFieldTokens };
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
    return Array.from(new Map(tokens.map((item) => [item.toLowerCase(), item])).values());
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

  const handleRecipientKeyDown = (field: RecipientField, event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter" || event.key === "," || event.key === "Tab") {
      event.preventDefault();
      commitDraftRecipients(field);
      return;
    }
    if (event.key === "Backspace" && !recipientDrafts[field] && recipientTokens[field].length) {
      removeRecipientToken(field, recipientTokens[field][recipientTokens[field].length - 1]);
    }
  };

  const buildSendOverrides = (): SendOverrides => {
    flushBodyChange();
    const committedTo = getCommittedRecipients("to");
    const committedCc = getCommittedRecipients("cc");
    const committedBcc = getCommittedRecipients("bcc");
    const bodyHtml = editor?.getHTML() ?? body;
    const nextBodyJson = (editor?.getJSON() as Record<string, unknown> | undefined) ?? bodyJson ?? null;
    const uploadedAttachmentIds = attachments.map((item) => item.serverId).filter((id): id is string => Boolean(id));

    const toValue = committedTo.join(",");
    const ccValue = committedCc.join(",");
    const bccValue = committedBcc.join(",");

    onToChange(toValue);
    onCcChange(ccValue);
    onBccChange(bccValue);
    setRecipientDrafts({ to: "", cc: "", bcc: "" });

    return {
      to: toValue,
      cc: ccValue,
      bcc: bccValue,
      body: bodyHtml,
      bodyJson: nextBodyJson,
      attachmentIds: Array.from(new Set([...attachmentIds, ...uploadedAttachmentIds])),
    };
  };

  const handleSend = () => {
    setValidationError("");
    const overrides = buildSendOverrides();
    void onSend(overrides);
  };

  const handleSchedule = (scheduledAtIso: string) => {
    if (!onSchedule) return;
    setValidationError("");
    const overrides = buildSendOverrides();
    void onSchedule(scheduledAtIso, overrides);
    setShowSchedulePopover(false);
  };

  const renderCollapsedRecipients = () => (
    <button
      type="button"
      onClick={() => {
        setRecipientsExpanded(true);
        requestAnimationFrame(() => toInputRef.current?.focus());
      }}
      className="flex min-h-10 w-full items-center border-b border-border bg-transparent px-4 py-2 text-left text-sm text-muted-foreground hover:bg-mail-hover/50"
    >
      Destinatarios
    </button>
  );

  const renderRecipientField = (field: RecipientField, label: string) => {
    const inputRef = recipientFieldRef(field);

    return (
      <div
        className="flex min-h-10 flex-wrap items-center gap-2 border-b border-border bg-transparent px-4 py-2 text-sm"
        onClick={() => inputRef.current?.focus()}
      >
        <span className="w-10 shrink-0 text-muted-foreground">{label}</span>
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-1.5">
          {recipientTokens[field].map((token) => (
            <span key={`${field}-${token}`} className="inline-flex max-w-full items-center gap-1 rounded-full bg-mail-surface px-2 py-1 text-xs">
              <span className="truncate">{token}</span>
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
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
            aria-label={label}
            value={recipientDrafts[field]}
            onChange={(event) => handleRecipientDraftChange(field, event.target.value)}
            onBlur={() => commitDraftRecipients(field)}
            onKeyDown={(event) => handleRecipientKeyDown(field, event)}
            className="min-w-40 flex-1 border-0 bg-transparent outline-none"
          />
        </div>
        {field === "to" ? (
          <div className="ml-auto flex shrink-0 items-center gap-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            {!showCc ? (
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
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
                onClick={(event) => {
                  event.stopPropagation();
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

  const syncEditorBody = () => {
    if (!editor) return;

    const html = editor.getHTML();
    const json = editor.getJSON() as Record<string, unknown>;
    const bodyText = editor.getText().trim();

    latestBodyRef.current = { html, json, text: bodyText };
    flushBodyChange();
  };

  const applyFontSize = (value: string) => {
    if (!editor) return;

    const fontSize = FONT_SIZE_BY_VALUE[value];
    setSelectedFontSize(value);

    const command = fontSize ? editor.chain().focus().setFontSize(fontSize) : editor.chain().focus().unsetFontSize();

    command.run();
    syncEditorBody();
  };

  const formatButtonClass = (active?: boolean) =>
    cn(
      "flex size-8 items-center justify-center rounded-md border border-transparent text-xs transition-colors hover:border-border hover:bg-mail-hover",
      active && "border-border bg-mail-hover shadow-sm ring-1 ring-black/5",
    );

  return (
    <div data-mail-composer-surface={composeId} className="flex min-h-0 flex-1 flex-col">
      {showRecipients ? (
        recipientsExpanded ? (
          <>
            {renderRecipientField("to", "Para")}
            {showCc ? renderRecipientField("cc", "CC") : null}
            {showBcc ? renderRecipientField("bcc", "BCC") : null}
          </>
        ) : (
          renderCollapsedRecipients()
        )
      ) : null}

      {showSubject ? (
        <input
          type="text"
          placeholder="Asunto"
          value={subject}
          onChange={(event) => onSubjectChange(event.target.value)}
          className="border-b border-border bg-transparent px-4 py-2 text-sm outline-none"
        />
      ) : null}

      <div
        className="min-h-0 flex-1 overflow-y-auto scroll-area"
        onDrop={(event) => {
          event.preventDefault();
          void addFiles(event.dataTransfer.files, "file");
        }}
        onDragOver={(event) => event.preventDefault()}
      >
        <EditorContent editor={editor} />
      </div>

      {attachments.some((item) => item.kind === "file") ? (
        <div className="flex flex-col gap-2 border-t border-border px-4 py-2">
          {attachments
            .filter((item) => item.kind === "file")
            .map((item) => (
              <div key={item.id} className={cn("rounded-md border p-2", item.uploadError ? "border-destructive/40 bg-destructive/5" : "border-border")}>
                <div className="flex min-w-0 items-center gap-2">
                  <Paperclip className="size-4 shrink-0 text-muted-foreground" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-medium">{item.name}</p>
                    <p className="text-[11px] text-muted-foreground">{item.sizeLabel}</p>
                  </div>
                  <button type="button" onClick={() => void removeAttachment(item.id)} className="rounded-full p-1 hover:bg-mail-hover" title="Quitar adjunto">
                    <X className="size-3.5" />
                  </button>
                </div>
                {item.uploading ? <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-mail-hover"><div className="h-full w-1/2 animate-pulse rounded-full bg-primary" /></div> : null}
                {item.uploadError ? <p className="mt-2 rounded-md bg-destructive/10 px-2 py-1 text-[11px] text-destructive">{item.uploadError}</p> : null}
              </div>
            ))}
        </div>
      ) : null}

      {validationError ? <div className="bg-destructive/10 px-4 py-2 text-xs text-destructive">{validationError}</div> : null}
      {error ? <div className="bg-destructive/10 px-4 py-2 text-xs text-destructive">{error}</div> : null}

      <div className="relative flex items-center gap-1 border-t border-border p-2">
        <SystemButton onClick={handleSend} leftIcon={<Send className="size-4" />} className="rounded-full" disabled={isBusy}>
          {isSending ? "Enviando..." : "Enviar"}
        </SystemButton>
        {showSchedule && onSchedule ? (
          <>
            <button
              ref={scheduleAnchorRef}
              type="button"
              onClick={() => {
                setScheduleDateValue((current) => current ?? new Date(Date.now() + 60 * 60_000));
                setShowSchedulePopover((value) => !value);
              }}
              className="flex size-9 items-center justify-center rounded-full hover:bg-mail-hover"
              title="Programar envío"
            >
              <CalendarClock className="size-5" />
            </button>
            <Popover
              open={showSchedulePopover}
              onClose={() => setShowSchedulePopover(false)}
              anchorRef={scheduleAnchorRef}
              placement="top-start"
              offset={8}
              zIndex={10000}
              hideHeader
              className="w-72 rounded-lg border border-border bg-popover shadow-popover"
              bodyClassName="p-3"
            >
              <div className="flex flex-col gap-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Programar envío</p>
                <div className="grid grid-cols-1 gap-1">
                  <button
                    type="button"
                    className="rounded px-2 py-1.5 text-left text-sm hover:bg-mail-hover"
                    onClick={() => handleSchedule(new Date(Date.now() + 60 * 60_000).toISOString())}
                  >
                    En 1 hora
                  </button>
                  <button
                    type="button"
                    className="rounded px-2 py-1.5 text-left text-sm hover:bg-mail-hover"
                    onClick={() => {
                      const d = new Date();
                      d.setDate(d.getDate() + 1);
                      d.setHours(8, 0, 0, 0);
                      handleSchedule(d.toISOString());
                    }}
                  >
                    Mañana 8:00
                  </button>
                </div>
                <FloatingDateTimePicker
                  label="Fecha y hora"
                  name={`${composeId}-schedule-datetime`}
                  value={scheduleDateValue}
                  onChange={setScheduleDateValue}
                  disablePast
                  clearable={false}
                  containerClassName="w-full"
                />
                <div className="flex justify-end gap-2">
                  <SystemButton type="button" variant="ghost" size="sm" onClick={() => setShowSchedulePopover(false)}>
                    Cancelar
                  </SystemButton>
                  <SystemButton
                    type="button"
                    size="sm"
                    onClick={() => {
                      if (!scheduleDateValue || Number.isNaN(scheduleDateValue.getTime())) {
                        setValidationError("Selecciona una fecha y hora válida.");
                        return;
                      }
                      handleSchedule(scheduleDateValue.toISOString());
                    }}
                  >
                    Programar
                  </SystemButton>
                </div>
              </div>
            </Popover>
          </>
        ) : null}
        <button type="button" onClick={() => fileInputRef.current?.click()} className="flex size-9 items-center justify-center rounded-full hover:bg-mail-hover" title="Adjuntar archivo">
          <Paperclip className="size-5" />
        </button>
        <button ref={linkAnchorRef} type="button" onClick={() => setShowLink((value) => !value)} className="flex size-9 items-center justify-center rounded-full hover:bg-mail-hover" title="Insertar enlace">
          <LinkIcon className="size-5" />
        </button>
        <Popover open={showLink} onClose={() => setShowLink(false)} anchorRef={linkAnchorRef} placement="top-start" offset={8} zIndex={10000} hideHeader className="w-72 rounded-lg border border-border bg-popover shadow-popover" bodyClassName="p-3">
          <div className="flex flex-col gap-2">
            <p className="text-xs font-medium">Insertar enlace</p>
            <FloatingInput label="Texto" name={`${composeId}-link-text`} value={linkName} onChange={(event) => setLinkName(event.target.value)} />
            <FloatingInput label="URL" name={`${composeId}-link-url`} value={linkUrl} onChange={(event) => setLinkUrl(event.target.value)} />
            <div className="flex justify-end gap-2">
              <SystemButton variant="ghost" size="sm" onClick={() => setShowLink(false)}>Cancelar</SystemButton>
              <SystemButton size="sm" onClick={insertLink}>Aceptar</SystemButton>
            </div>
          </div>
        </Popover>
        <button ref={formatAnchorRef} type="button" onClick={() => setShowFormat((value) => !value)} className="flex size-9 items-center justify-center rounded-full hover:bg-mail-hover" title="Formato de texto">
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
              <span className="px-1 text-xs font-semibold text-muted-foreground">Formato</span>

              <button
                type="button"
                onClick={() => {
                  editor?.chain().focus().unsetAllMarks().clearNodes().run();
                  syncEditorBody();
                }}
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
                  value={selectedFontSize}
                  onChange={(event) => applyFontSize(event.target.value)}
                  className="h-full border-0 bg-transparent text-xs outline-none"
                >
                  {FONT_SIZE_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              <button
                type="button"
                onClick={() => editor?.chain().focus().toggleBold().run()}
                className={cn(formatButtonClass(editor?.isActive("bold")), "font-bold")}
                title="Negrita"
              >
                <RiBold className="size-4" />
              </button>

              <button
                type="button"
                onClick={() => editor?.chain().focus().toggleItalic().run()}
                className={cn(formatButtonClass(editor?.isActive("italic")), "italic")}
                title="Cursiva"
              >
                <RiItalic className="size-4" />
              </button>

              <button
                type="button"
                onClick={() => editor?.chain().focus().toggleUnderline().run()}
                className={cn(formatButtonClass(editor?.isActive("underline")), "underline")}
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
                  onChange={(event) => {
                    editor?.chain().focus().setColor(event.target.value).run();
                    syncEditorBody();
                  }}
                  className="sr-only"
                />
              </label>

              <span className="mx-0.5 h-6 w-px bg-border" />

              <button
                type="button"
                onClick={() => editor?.chain().focus().setTextAlign("left").run()}
                className={formatButtonClass(editor?.isActive({ textAlign: "left" }))}
                title="Alinear izquierda"
              >
                <RiAlignLeft className="size-4" />
              </button>

              <button
                type="button"
                onClick={() => editor?.chain().focus().setTextAlign("center").run()}
                className={formatButtonClass(editor?.isActive({ textAlign: "center" }))}
                title="Centrar"
              >
                <RiAlignCenter className="size-4" />
              </button>

              <button
                type="button"
                onClick={() => editor?.chain().focus().setTextAlign("right").run()}
                className={formatButtonClass(editor?.isActive({ textAlign: "right" }))}
                title="Alinear derecha"
              >
                <RiAlignRight className="size-4" />
              </button>

              <span className="mx-0.5 h-6 w-px bg-border" />

              <button
                type="button"
                onClick={() => editor?.chain().focus().toggleBulletList().run()}
                className={formatButtonClass(editor?.isActive("bulletList"))}
                title="Lista con viñetas"
              >
                <RiListUnordered className="size-4" />
              </button>

              <button
                type="button"
                onClick={() => editor?.chain().focus().toggleOrderedList().run()}
                className={formatButtonClass(editor?.isActive("orderedList"))}
                title="Lista numerada"
              >
                <RiListOrdered className="size-4" />
              </button>
            </div>
          </div>
        </Popover>
        <button type="button" onClick={() => imageInputRef.current?.click()} className="flex size-9 items-center justify-center rounded-full hover:bg-mail-hover" title="Insertar imagen">
          <ImageIcon className="size-5" />
        </button>
        {showLabels ? (
          <div className="relative">
            <button ref={labelsAnchorRef} type="button" onClick={() => setShowLabelMenu((value) => !value)} className="flex size-9 items-center justify-center rounded-full hover:bg-mail-hover" title="Etiquetas">
              <Bookmark className="size-5 rotate-270" />
              {selectedLabelIds.length > 0 ? <span className="ml-1 text-[10px] font-semibold">{selectedLabelIds.length}</span> : null}
            </button>
            <Popover open={showLabelMenu} onClose={() => setShowLabelMenu(false)} anchorRef={labelsAnchorRef} placement="top-start" offset={8} zIndex={10000} hideHeader className="rounded-lg border border-border bg-popover shadow-popover" bodyClassName="p-2 px-0">
              <div className="max-h-50 overflow-y-auto pr-1">
                {(labels ?? []).length === 0 ? <p className="px-2 py-2 text-xs text-muted-foreground">No hay etiquetas creadas.</p> : null}
                {(labels ?? []).map((label) => {
                  const selected = selectedLabelIds.includes(label.id);
                  return (
                    <button key={label.id} type="button" onClick={() => onToggleLabel?.(label.id)} className={cn("flex w-full items-center justify-between gap-2 rounded-md p-1 text-left text-sm hover:bg-mail-hover", selected && "bg-mail-hover")}>
                      <span className="flex min-w-0 items-center gap-2">
                        <Bookmark className="size-4 shrink-0 rotate-270" style={{ color: label.color ?? "currentColor", fill: label.color ?? "transparent" }} />
                        <span className="truncate">{label.name}</span>
                      </span>
                      {selected ? <Check className="size-4 shrink-0" /> : null}
                    </button>
                  );
                })}
              </div>
            </Popover>
          </div>
        ) : null}
        <button type="button" onClick={() => void onDiscard()} disabled={isBusy} className="ml-auto flex size-9 items-center justify-center rounded-full hover:bg-mail-hover" title="Descartar borrador">
          <Trash2 className="size-5" />
        </button>
        <input ref={fileInputRef} type="file" multiple className="hidden" onChange={(event) => void addFiles(event.target.files, "file")} />
        <input ref={imageInputRef} type="file" accept="image/*" multiple className="hidden" onChange={(event) => void addFiles(event.target.files, "image")} />
      </div>
    </div>
  );
}
