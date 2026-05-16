import { memo, useEffect, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { Link, useLocation, useSearchParams } from "react-router-dom";
import { RoutesPaths } from "@/routes/config/routesPaths";
import { useUnreadMailCount } from "@/features/mail/hooks/useUnreadMailCount";
import { cn } from "@/shared/lib/utils";
import { useSidebarContext } from "./SidebarContext";
import { IconBell, IconMenu } from "./icons";
import type { User } from "./types";
import UserMenu from "./UserMenu";
import { useCompany } from "@/shared/hooks/useCompany";
import { resolveCompanyAssetUrl } from "@/features/company/utils/companyAssets";
import { getSidebarTitleByPath } from "@/shared/config/sidebarConfig";
import { deleteSearchHistory, listSearchHistory, saveSearchHistory } from "@/features/mail/services/messages.service";
import { X } from "lucide-react";

interface DashboardHeaderProps {
  user: User;
  onLogout: () => void;
}

const DashboardHeader = ({ user, onLogout }: DashboardHeaderProps) => {
  const { isCollapsed, isMobile, toggleSidebar } = useSidebarContext();
  const { count } = useUnreadMailCount();
  const { company } = useCompany();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const [searchInput, setSearchInput] = useState(searchParams.get("q") ?? "");
  const [history, setHistory] = useState<Array<{ id: string; query: string }>>([]);
  const [historyOpen, setHistoryOpen] = useState(false);
  const historyRef = useRef<HTMLDivElement | null>(null);
  const unreadCount = count.unread ?? 0;
  const logoUrl = resolveCompanyAssetUrl(company?.logoPath);
  const isEmailPage = location.pathname.startsWith(RoutesPaths.notifications);
  const emailSearch = searchParams.get("q") ?? "";

  const applySearch = async (value: string) => {
    const next = new URLSearchParams(searchParams);
    const trimmed = value.trim();
    const current = (searchParams.get("q") ?? "").trim();
    if (trimmed === current) return;
    if (trimmed) {
      next.set("q", trimmed);
      const updated = await saveSearchHistory(trimmed);
      setHistory(updated ?? []);
    } else {
      next.delete("q");
    }
    setSearchParams(next, { replace: true });
  };
  const routeTitle =
    getSidebarTitleByPath(location.pathname) ??
    ({
      [RoutesPaths.profile]: "Perfil",
      [RoutesPaths.sessions]: "Sesiones de usuario",
      [RoutesPaths.notifications]: "Email",
    }[location.pathname] ?? "");

  useEffect(() => {
    setSearchInput(emailSearch);
  }, [emailSearch]);

  useEffect(() => {
    if (!isEmailPage) return;
    void (async () => {
      try {
        const items = await listSearchHistory();
        setHistory(items ?? []);
      } catch {
        setHistory([]);
      }
    })();
  }, [isEmailPage]);

  useEffect(() => {
    const onMouseDown = (event: MouseEvent) => {
      if (!historyRef.current) return;
      if (!historyRef.current.contains(event.target as Node)) setHistoryOpen(false);
    };
    document.addEventListener("mousedown", onMouseDown);
    return () => document.removeEventListener("mousedown", onMouseDown);
  }, []);

  return (
    <header className="flex py-1">
      <div className="flex w-[180px] shrink-0 items-center gap-2 pl-1 pr-2">
        <button
          type="button"
          title={isMobile ? "Abrir menu" : isCollapsed ? "Expandir menu" : "Colapsar menu"}
          onClick={toggleSidebar}
          className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-sidebar-muted transition-colors hover:bg-sidebar-accent hover:text-sidebar-foreground"
        >
          <IconMenu />
        </button>

        <Link to={RoutesPaths.dashboard} className="min-w-0">
          {logoUrl ? (
            <img
              src={logoUrl}
              alt="Logo de empresa"
              className={cn("h-7 w-auto max-w-[130px] object-contain", isCollapsed && !isMobile ? "opacity-70" : "opacity-100")}
            />
          ) : null}
        </Link>
      </div>

      <div className="flex min-w-0 flex-1 items-center justify-between gap-2 pr-3">
        <div className="min-w-0">
          {isEmailPage ? (
            <div className="relative" ref={historyRef}>
              <input
                value={searchInput}
                onChange={(event) => setSearchInput(event.target.value)}
                onFocus={() => setHistoryOpen(true)}
                onKeyDown={(event: KeyboardEvent<HTMLInputElement>) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    void applySearch((event.target as HTMLInputElement).value);
                    setHistoryOpen(false);
                  }
                }}
                onBlur={(event) => void applySearch(event.target.value)}
                placeholder="Buscar correo"
                className="h-9 w-[320px] max-w-full rounded-md border px-3 text-sm"
              />
              {historyOpen && history.length > 0 ? (
                <div className="absolute left-0 top-full z-30 mt-1 max-h-72 w-[360px] max-w-[80vw] overflow-auto rounded-md border bg-popover p-1 shadow-md">
                  {history.map((item) => (
                    <div key={item.id} className="flex items-center gap-1 rounded px-2 py-1 hover:bg-accent">
                      <button
                        className="flex-1 truncate text-left text-sm"
                        onClick={() => {
                          setSearchInput(item.query);
                          void applySearch(item.query);
                          setHistoryOpen(false);
                        }}
                      >
                        {item.query}
                      </button>
                      <button
                        className="inline-flex h-6 w-6 items-center justify-center rounded hover:bg-muted"
                        onClick={() => {
                          void (async () => {
                            await deleteSearchHistory(item.id);
                            setHistory((prev) => prev.filter((current) => current.id !== item.id));
                          })();
                        }}
                        title="Eliminar búsqueda"
                      >
                        <X className="size-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
          ) : routeTitle ? (
            <h1 className="truncate text-lg font-semibold">{routeTitle}</h1>
          ) : null}
        </div>

        <div className="flex items-center gap-2">
          <Link
            to={RoutesPaths.notifications}
            className="relative inline-flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            title="Ir a mensajeria"
          >
            <IconBell />
            {unreadCount > 0 ? (
              <span className="absolute -right-1 -top-1 inline-flex min-h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-semibold leading-none text-destructive-foreground">
                {unreadCount > 99 ? "99+" : unreadCount}
              </span>
            ) : null}
          </Link>

          <div className="w-auto">
            <UserMenu user={user} onLogout={onLogout} compact placement="bottom-end" />
          </div>
        </div>
      </div>
    </header>
  );
};

export default memo(DashboardHeader);


