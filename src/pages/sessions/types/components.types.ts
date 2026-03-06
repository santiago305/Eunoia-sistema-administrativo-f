import type { Session } from "./session.types";

export interface SessionsDeviceCardProps {
  session: Session;
  revokingId: string | null;
  onRevoke: (id: string) => void;
  onOpenDetails: (session: Session) => void;
}

export interface SessionsQuickActionsProps {
  totalCount: number;
  revokingAll: boolean;
  onRevokeAll: () => void;
}

export interface SessionsHeaderProps {
  title: string;
  subtitle: string;
}

export interface SessionsSecurityTipProps {
  tip: string;
}

export interface SessionsSummaryCardProps {
  activeCount: number;
  otherCount: number;
}


