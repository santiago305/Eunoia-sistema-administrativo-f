import {
  memo,
  useState,
  cloneElement,
  isValidElement,
  ReactElement,
} from "react";
import { Link, useLocation } from "react-router-dom";
import { IconChevronRight } from "./icons";
import { ChevronDown, ChevronUp } from "lucide-react";
import { Trash2 } from "lucide-react";
import { useSidebarContext } from "./SidebarContext";
import type { SidebarItem as SidebarItemType } from "./types";
import { cn } from "@/shared/lib/utils";
import { useAuth } from "@/shared/hooks/useAuth";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/shared/components/ui/tooltip";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/shared/components/ui/popover";

interface SidebarItemProps {
  item: SidebarItemType;
}

const splitHref = (href?: string) => {
  if (!href) return { path: "", query: "" };
  const [path, query = ""] = href.split("?");
  return { path, query };
};

const isLinkActive = (href: string | undefined, pathname: string, search: string) => {
  if (!href) return false;
  const { path, query } = splitHref(href);
  if (path !== pathname) return false;
  if (!query) return true;
  return query === (search.startsWith("?") ? search.slice(1) : search);
};

const hasActiveItem = (
  item: SidebarItemType,
  pathname: string,
  search: string,
  resolveHref: (item: SidebarItemType) => string | undefined,
): boolean =>
  isLinkActive(resolveHref(item), pathname, search) ||
  Boolean(item.children?.some((child) => hasActiveItem(child, pathname, search, resolveHref)));

interface NestedSidebarItemProps {
  item: SidebarItemType;
  pathname: string;
  search: string;
  resolveHref: (item: SidebarItemType) => string | undefined;
  canManageLabels: boolean;
  requestDeleteLabel: (event: React.MouseEvent, labelId?: string) => void;
  onNavigate?: () => void;
  compact?: boolean;
}

const NestedSidebarItem = ({
  item,
  pathname,
  search,
  resolveHref,
  canManageLabels,
  requestDeleteLabel,
  onNavigate,
  compact = false,
}: NestedSidebarItemProps) => {
  const href = resolveHref(item);
  const hasChildren = Boolean(item.children?.length);
  const isActive = isLinkActive(href, pathname, search);
  const isBranchActive = hasActiveItem(item, pathname, search, resolveHref);
  const [isOpen, setIsOpen] = useState(isBranchActive);

  if (hasChildren) {
    const branchClassName = cn(
      "flex w-full items-center rounded-lg transition-colors duration-200",
      isBranchActive
        ? "bg-primary/8 font-medium text-primary"
        : "text-sidebar-muted hover:bg-sidebar-accent/60 hover:text-sidebar-foreground",
    );
    const branchMainClassName = cn(
      "flex min-w-0 flex-1 items-center text-left",
      compact ? "min-h-[34px] px-3 py-1.5 text-[13px]" : "min-h-8 px-2.5 py-1.5 text-[12px]",
    );

    return (
      <div>
        <div className={branchClassName}>
          {href ? (
            <Link to={href} onClick={onNavigate} className={branchMainClassName}>
              <span className="flex-1 truncate">{item.label}</span>
            </Link>
          ) : (
            <button
              type="button"
              onClick={() => setIsOpen((current) => !current)}
              aria-expanded={isOpen}
              className={branchMainClassName}
            >
              <span className="flex-1 truncate">{item.label}</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => setIsOpen((current) => !current)}
            aria-expanded={isOpen}
            aria-label={`${isOpen ? "Ocultar" : "Mostrar"} submenú de ${item.label}`}
            className="mr-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-md hover:bg-black/5"
          >
            <IconChevronRight
              className={cn("size-3.5 shrink-0 transition-transform duration-200", isOpen && "rotate-90")}
            />
          </button>
        </div>

        <div
          className={cn(
            "overflow-hidden transition-[max-height,opacity] duration-200 ease-out",
            isOpen ? "max-h-96 opacity-100" : "max-h-0 opacity-0",
          )}
        >
          <div className="relative ml-3 mt-1 space-y-1 pl-3">
            <div className="absolute bottom-1 left-0 top-1 w-px rounded-full bg-border/70" />
            {item.children?.map((child, index) => (
              <NestedSidebarItem
                key={`${child.href ?? child.label}-${index}`}
                item={child}
                pathname={pathname}
                search={search}
                resolveHref={resolveHref}
                canManageLabels={canManageLabels}
                requestDeleteLabel={requestDeleteLabel}
                onNavigate={onNavigate}
                compact={compact}
              />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <Link
      to={href || "#"}
      onClick={onNavigate}
      className={cn(
        "group/child flex items-center rounded-lg transition-all duration-200",
        compact ? "min-h-[34px] px-3 py-1.5 text-[13px]" : "min-h-8 px-2.5 py-1.5 text-[12px]",
        isActive
          ? "bg-primary/8 font-medium text-primary"
          : compact
          ? "text-muted-foreground hover:bg-accent/70 hover:text-foreground"
          : "text-sidebar-muted hover:bg-sidebar-accent/60 hover:text-sidebar-foreground",
      )}
    >
      {item.icon && isValidElement(item.icon)
        ? cloneElement(item.icon as ReactElement<{ className?: string }>, {
            className: cn(
              "mr-2 size-[16px] shrink-0",
              isActive ? "text-primary" : "text-sidebar-foreground/80",
            ),
          })
        : null}
      <span className="flex-1 truncate">{item.label}</span>
      {item.isCustomLabel && canManageLabels ? (
        <button
          type="button"
          onClick={(event) => requestDeleteLabel(event, item.labelId)}
          className="ml-1 inline-flex h-6 w-6 items-center justify-center rounded opacity-0 transition group-hover/child:opacity-100 hover:bg-destructive/10 hover:text-destructive"
          title="Eliminar etiqueta"
        >
          <Trash2 className="size-3.5" />
        </button>
      ) : null}
      {typeof item.badgeCount === "number" ? (
        <span className="ml-2 text-[11px] text-sidebar-muted">{item.badgeCount}</span>
      ) : null}
    </Link>
  );
};

const SidebarItemComponent = ({ item }: SidebarItemProps) => {
  const { isCollapsed, isMobile } = useSidebarContext();
  const { permissions } = useAuth();
  const location = useLocation();
  const canManageLabels = permissions.includes("notifications.labels.create");
  const isSidebarCollapsed = isCollapsed && !isMobile;
  const buildCurrentRouteActionHref = (paramName: string) => {
    const current = new URLSearchParams(location.search);
    current.set(paramName, "1");
    return `${location.pathname}?${current.toString()}`;
  };
  const resolveItemHref = (sidebarItem: SidebarItemType) => {
    if (sidebarItem.isComposeAction) return buildCurrentRouteActionHref("compose");
    if (sidebarItem.isCreateLabelAction) return buildCurrentRouteActionHref("createLabel");
    return sidebarItem.href;
  };
  const itemHref = resolveItemHref(item);

  const hasChildren = !!item.children?.length;
  const isActive = isLinkActive(itemHref, location.pathname, location.search);
  const isChildActive = item.children?.some((child) =>
    hasActiveItem(child, location.pathname, location.search, resolveItemHref)
  );

  // Solo abre inicialmente si algún hijo está activo.
  // Después de eso el usuario puede cerrarlo manualmente aunque siga en una ruta hija.
  const [isOpen, setIsOpen] = useState(Boolean(isChildActive));
  const [popoverOpen, setPopoverOpen] = useState(false);

  const isParentHighlighted = isActive || isChildActive;

  const renderIcon = () => {
    if (!item.icon || !isValidElement(item.icon)) return null;

    const iconElement = item.icon as ReactElement<{ className?: string }>;
    return cloneElement(iconElement, {
      className: cn(
        iconElement.props.className,
        "shrink-0 transition-colors duration-200",
        item.isComposeAction && isSidebarCollapsed ? "size-4" : "size-[18px]",
        // Redactar: color del icono (solo boton especial).
        item.isComposeAction
          ? "text-primary-foreground"
          : isParentHighlighted
          ? "text-primary"
          : "text-sidebar-foreground/90 group-hover:text-sidebar-foreground"
      ),
    });
  };

  const toggleChildren = (e?: React.MouseEvent) => {
    e?.preventDefault();
    e?.stopPropagation();
    if (hasChildren) setIsOpen((prev) => !prev);
  };

  const requestDeleteLabel = (e: React.MouseEvent, labelId?: string) => {
    e.preventDefault();
    e.stopPropagation();
    if (!labelId) return;
    const next = new URLSearchParams(location.search);
    next.set("deleteLabel", labelId);
    window.history.replaceState(null, "", `${location.pathname}?${next.toString()}`);
    window.dispatchEvent(new PopStateEvent("popstate"));
  };

  const parentBaseClass = cn(
    "group flex w-full items-center rounded-xl transition-all duration-200",
    // Redactar: altura del boton en expanded/collapsed.
    item.isComposeAction ? "min-h-10" : "min-h-8",
    // Redactar collapsed: caja cuadrada del boton cuando el sidebar esta cerrado.
    // Redactar expanded: padding/margen del boton cuando el sidebar esta abierto.
    isSidebarCollapsed
      ? item.isComposeAction
        ? "mx-auto justify-center px-2 py-1.5"
        : "justify-center px-2 py-1.5"
      : item.isComposeAction
      ? "p-4 mb-2"
      : "px-2 py-1.5",
    // Redactar: fondo principal + texto blanco.
    item.isComposeAction
      ? "bg-primary text-primary-foreground shadow-sm hover:shadow-md"
      : isParentHighlighted
      ? "bg-primary/10 text-primary shadow-sm"
      : "text-sidebar-foreground hover:bg-sidebar-accent/70"
  );

  /**
   * Fila padre para items con submenu.
   *
   * Antes los items con hijos usaban `px-2.5 py-2`, mientras que los items
   * simples usaban `px-2 py-1.5`. Esa diferencia hacía que módulos como
   * "Catálogo" se vieran ligeramente desalineados frente a los módulos sin hijos.
   *
   * Esta clase replica la misma base visual del item simple, pero sin padding
   * horizontal en el contenedor para que el link interno y el botón del caret
   * puedan convivir sin mover el icono ni el texto.
   */
  const parentWithChildrenClass = cn(
    "group flex w-full items-center rounded-xl transition-all duration-200",
    item.isComposeAction ? "min-h-10" : "min-h-8",
    item.isComposeAction
      ? "bg-primary text-primary-foreground shadow-sm hover:shadow-md"
      : isParentHighlighted
      ? "bg-primary/10 text-primary shadow-sm"
      : "text-sidebar-foreground hover:bg-sidebar-accent/70"
  );

  const parentWithChildrenMainClass =
    "flex min-w-0 flex-1 items-center px-2 py-1.5 text-left";

  const labelClass = cn(
    "truncate text-[12px] font-medium transition-all duration-200",
    isSidebarCollapsed ? "w-0 opacity-0" : "w-auto opacity-100"
  );

  const caret = (
    <span
      className={cn(
        "flex items-center justify-center text-sidebar-muted transition-transform duration-200",
        isOpen && "rotate-90",
        isParentHighlighted && "text-primary/80"
      )}
    >
      {item.collapsibleLabels ? (
        isOpen ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />
      ) : (
        <IconChevronRight className="size-4" />
      )}
    </span>
  );

  const ParentInnerContent = () => (
    <>
      {renderIcon()}
      {/* Redactar expanded: separacion icono-texto (ml-3). */}
      {!isSidebarCollapsed && (
        <span className={cn("ml-3 flex-1 text-left", labelClass)}>
          {item.collapsibleLabels ? (isOpen ? item.collapsibleLabels.open : item.collapsibleLabels.closed) : item.label}
        </span>
      )}
      {!isSidebarCollapsed && typeof item.badgeCount === "number" ? (
        <span className="ml-2 text-[11px] text-sidebar-muted">{item.badgeCount}</span>
      ) : null}
    </>
  );

  // ---------------------------------------------
  // COLLAPSED + CHILDREN => POPOVER
  // ---------------------------------------------
  if (isSidebarCollapsed && hasChildren) {
    return (
      <div className="mb-1">
        <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
          <PopoverTrigger asChild>
            <button
              type="button"
              title={item.label}
              className={parentBaseClass}
            >
              {renderIcon()}
            </button>
          </PopoverTrigger>

          <PopoverContent
            side="right"
            align="start"
            sideOffset={12}
            className={cn(
              "w-auto rounded-2xl border border-border/60 bg-popover/95 p-1.5",
              "shadow-[0_10px_30px_rgba(15,23,42,0.10),0_2px_8px_rgba(15,23,42,0.06)]",
              "backdrop-blur-md"
            )}
          >
            <div className="px-2.5 pb-1 pt-1">
              <p className="truncate text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground/90">
                {item.label}
              </p>
            </div>

            <div className="max-h-[min(80vh,48rem)] space-y-0.5 overflow-y-auto">
              {itemHref && (
                <Link
                  to={itemHref}
                  onClick={() => setPopoverOpen(false)}
                  className={cn(
                    "flex min-h-[34px] items-center rounded-xl px-3 py-1.5 text-[13px] transition-all duration-200",
                    isActive
                      ? "bg-primary/9 text-primary font-medium shadow-[0_1px_2px_rgba(0,0,0,0.03)]"
                      : "text-foreground/90 hover:bg-accent/70"
                  )}
                >
                  <span className="truncate">Resumen</span>
                </Link>
              )}

              {item.children?.map((child, index) => {
                return (
                  <NestedSidebarItem
                    key={`${child.href ?? child.label}-${index}`}
                    item={child}
                    pathname={location.pathname}
                    search={location.search}
                    resolveHref={resolveItemHref}
                    canManageLabels={canManageLabels}
                    requestDeleteLabel={requestDeleteLabel}
                    onNavigate={() => setPopoverOpen(false)}
                    compact
                  />
                );
              })}
            </div>
          </PopoverContent>
        </Popover>
      </div>
    );
  }

  // ---------------------------------------------
  // COLLAPSED + SIN CHILDREN => TOOLTIP
  // ---------------------------------------------
  if (isSidebarCollapsed && !hasChildren) {
    const singleItem = itemHref ? (
      <Link to={itemHref} className={parentBaseClass}>
        {renderIcon()}
      </Link>
    ) : (
      <div className={parentBaseClass}>{renderIcon()}</div>
    );

    return (
      <div className="mb-1">
        <Tooltip delayDuration={100}>
          <TooltipTrigger asChild>{singleItem}</TooltipTrigger>
          <TooltipContent side="right" className="rounded-lg px-3 py-1.5">
            {item.label}
          </TooltipContent>
        </Tooltip>
      </div>
    );
  }

  // ---------------------------------------------
  // EXPANDED MODE
  // ---------------------------------------------
  return (
    <div className="mb-1">
      {hasChildren ? (
        <div className={parentWithChildrenClass}>
          {itemHref ? (
            <Link
              to={itemHref}
              className={parentWithChildrenMainClass}
            >
              <ParentInnerContent />
            </Link>
          ) : (
            <button
              title="button"
              type="button"
              onClick={toggleChildren}
              className={parentWithChildrenMainClass}
            >
              <ParentInnerContent />
            </button>
          )}

          <button
            type="button"
            onClick={toggleChildren}
            title={isOpen ? `Ocultar submenu de ${item.label}` : `Mostrar submenu de ${item.label}`}
            className={cn(
              "mr-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-colors",
              "hover:bg-black/5"
            )}
            aria-label={isOpen ? "Ocultar submenú" : "Mostrar submenú"}
          >
            {caret}
          </button>
        </div>
      ) : itemHref ? (
        <Link to={itemHref} className={parentBaseClass}>
          <ParentInnerContent />
        </Link>
      ) : (
        <div className={parentBaseClass}>
          <ParentInnerContent />
        </div>
      )}

      {hasChildren && !isSidebarCollapsed ? (
        <div
          className={cn(
            "overflow-hidden transition-[max-height,opacity] duration-200 ease-out",
            isOpen ? "max-h-[60rem] opacity-100" : "max-h-0 opacity-0"
          )}
        >
          <div className="relative ml-5 mt-1 pl-4">
            <div className="absolute bottom-1 left-0 top-1 w-px rounded-full bg-border/80" />

            <div className="space-y-1">
              {item.children?.map((child, index) => {
                return (
                  <NestedSidebarItem
                    key={`${child.href ?? child.label}-${index}`}
                    item={child}
                    pathname={location.pathname}
                    search={location.search}
                    resolveHref={resolveItemHref}
                    canManageLabels={canManageLabels}
                    requestDeleteLabel={requestDeleteLabel}
                  />
                );
              })}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default memo(SidebarItemComponent);
