import { useEffect, useRef, useState } from "react";
import { ChevronDown, ExternalLink, Forward, Reply } from "lucide-react";
import { cn } from "@/shared/lib/utils";
import MailComposerSurface, { type MailComposerSurfaceProps } from "./composer/MailComposerSurface";
import { Popover } from "@/shared/components/modales/Popover";

type InlineMode = "reply" | "forward";

type InlineComposerProps = Omit<
  MailComposerSurfaceProps,
  "showSubject" | "showRecipients" | "showLabels" | "compact" | "onSend" | "onDiscard" | "onToChange" | "onCcChange" | "onBccChange"
> & {
  mode: InlineMode;
  to: string;
  cc: string;
  bcc: string;
  recipientLabel: string;
  onModeChange: (mode: InlineMode) => void;
  onToChange: (value: string) => void;
  onCcChange: (value: string) => void;
  onBccChange: (value: string) => void;
  onExpand: () => void;
  onSend: (overrides: { to: string; cc: string; bcc: string }) => void | Promise<void>;
  onDiscard: () => void | Promise<void>;
};

export default function InlineReplyForwardBox({
  mode,
  to,
  cc,
  bcc,
  recipientLabel,
  onModeChange,
  onToChange,
  onCcChange,
  onBccChange,
  onExpand,
  onSend,
  onDiscard,
  ...composerProps
}: InlineComposerProps) {
  const [showModeMenu, setShowModeMenu] = useState(false);
  const [localTo, setLocalTo] = useState(to);
  const [localCc, setLocalCc] = useState(cc);
  const [localBcc, setLocalBcc] = useState(bcc);
  const modeMenuAnchorRef = useRef<HTMLButtonElement | null>(null);
  const isReply = mode === "reply";

  useEffect(() => setLocalTo(to), [to]);
  useEffect(() => setLocalCc(cc), [cc]);
  useEffect(() => setLocalBcc(bcc), [bcc]);

  const modeIcon = isReply ? <Reply className="size-4" /> : <Forward className="size-4" />;

  return (
    <section className="rounded-md border border-border bg-background shadow-sm" aria-label={isReply ? "Responder inline" : "Reenviar inline"}>
      <div className="flex min-h-12 items-center gap-2 border-b border-border px-3">
        <div className="flex items-center gap-1">
          <span className="flex size-8 items-center justify-center rounded-full bg-mail-hover text-muted-foreground">{modeIcon}</span>
          <button
            ref={modeMenuAnchorRef}
            type="button"
            onClick={() => setShowModeMenu((value) => !value)}
            className="flex size-8 items-center justify-center rounded-full hover:bg-mail-hover"
            title="Cambiar modo"
          >
            <ChevronDown className="size-4" />
          </button>
        </div>

        <Popover
          open={showModeMenu}
          onClose={() => setShowModeMenu(false)}
          anchorRef={modeMenuAnchorRef}
          placement="bottom-start"
          offset={6}
          zIndex={10000}
          hideHeader
          className="w-36 rounded-md border border-border bg-popover shadow-popover"
          bodyClassName="p-1"
        >
          <button
            type="button"
            onClick={() => {
              onModeChange("reply");
              setShowModeMenu(false);
            }}
            className={cn("flex w-full items-center gap-2 rounded px-2 py-1.5 text-sm hover:bg-mail-hover", isReply && "bg-mail-hover")}
          >
            <Reply className="size-4" />
            Responder
          </button>
          <button
            type="button"
            onClick={() => {
              onModeChange("forward");
              setShowModeMenu(false);
            }}
            className={cn("flex w-full items-center gap-2 rounded px-2 py-1.5 text-sm hover:bg-mail-hover", !isReply && "bg-mail-hover")}
          >
            <Forward className="size-4" />
            Reenviar
          </button>
        </Popover>

        {isReply ? (
          <div className="min-w-0 flex-1 text-sm">
            <span className="font-medium">Responder</span>
            <span className="ml-2 truncate text-muted-foreground">{recipientLabel || localTo}</span>
          </div>
        ) : (
          <label className="grid min-w-0 flex-1 grid-cols-[40px_1fr] items-center gap-2 text-sm">
            <span className="text-xs text-muted-foreground">Para</span>
            <input
              aria-label="Para"
              value={localTo}
              onChange={(event) => {
                setLocalTo(event.target.value);
                onToChange(event.target.value);
              }}
              className="min-w-0 bg-transparent outline-none"
            />
          </label>
        )}

        <button type="button" onClick={onExpand} className="flex size-9 items-center justify-center rounded-full hover:bg-mail-hover" title="Abrir en ventana">
          <ExternalLink className="size-4" />
        </button>
      </div>

      <MailComposerSurface
        {...composerProps}
        to={localTo}
        cc={localCc}
        bcc={localBcc}
        showSubject={false}
        showRecipients={false}
        showLabels={false}
        compact
        onToChange={(value) => {
          setLocalTo(value);
          onToChange(value);
        }}
        onCcChange={(value) => {
          setLocalCc(value);
          onCcChange(value);
        }}
        onBccChange={(value) => {
          setLocalBcc(value);
          onBccChange(value);
        }}
        onSend={() => onSend({ to: localTo, cc: localCc, bcc: localBcc })}
        onDiscard={onDiscard}
      />
    </section>
  );
}
