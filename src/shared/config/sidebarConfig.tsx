import { 
    IconBell,
    IconCompany,
    IconHome,
    IconOutOrder,
    IconProduction,
    IconPurchase, 
    IconRowMaterial, 
    IconStock, IconUsers, 
    IconWarehouse 
} from "../components/components/dashboard/icons";
import { RoutesPaths } from "@/routes/config/routesPaths";
import { SidebarItem } from "../components/components/dashboard/types";

const SIDEBAR_ITEMS: SidebarItem[] = [
    {
        label: "Home",
        href: RoutesPaths.dashboard,
        icon: <IconHome className="text-sidebar-foreground" />,
    },
    {
        label: "Orden de salida",
        href: RoutesPaths.outOrder,
        icon: <IconOutOrder className="text-sidebar-foreground" />,
    },
    {
        label: "Compras",
        icon: <IconPurchase className="text-sidebar-foreground" />,
        href: RoutesPaths.purchases,
        children: [
            {
                label: "Historial de compras",
                href: RoutesPaths.purchasesHistory,
            },
        ],
    },
    {
        label: "Pagos",
        icon: <IconPurchase className="text-sidebar-foreground" />,
        href: RoutesPaths.payments,
    },
    {
        label: "Catalogo",
        icon: <IconStock className="text-sidebar-foreground" />,
        children: [
            {
                label: "Productos",
                href: RoutesPaths.catalogProducts,
            },
            {
                label: "Transferencias",
                href: RoutesPaths.catalogTransferences,
            },
            {
                label: "Ajustes",
                href: RoutesPaths.catalogAdjustments,
            },
            {
                label: "Movimientos",
                href: RoutesPaths.KardexFinished,
            },
            {
                label: "Inventario",
                href: RoutesPaths.catalogInventory,
            },
        ],
    },
    {
        label: "Suministros",
        icon: <IconRowMaterial className="text-sidebar-foreground" />,
        children: [
            {
                label: "Materias Primas",
                href: RoutesPaths.rowMaterial,
            },
            {
                label: "Transferencias",
                href: RoutesPaths.rowMaterialTransfer,
            },
            {
                label: "Ajustes",
                href: RoutesPaths.rowMaterialAdjustments,
            },
            {
                label: "Movimientos",
                href: RoutesPaths.KardexPrima,
            },
            {
                label: "Inventario",
                href: RoutesPaths.rowMaterialDocuments,
            },
        ],
    },
    {
        label: "Producción",
        href: RoutesPaths.production,
        icon: <IconProduction className="text-sidebar-foreground" />,
    },
    {
        label: "Almacenes",
        href: RoutesPaths.warehouses,
        icon: <IconWarehouse className="text-sidebar-foreground" />
    },
    {
        label: "Proveedores",
        icon: <IconUsers className="text-sidebar-foreground" />,
        href: RoutesPaths.providers
    },
    {
        label: "Usuarios",
        href: RoutesPaths.users,
        icon: <IconUsers className="text-sidebar-foreground" />,
    },
    {
        label: "Roles",
        href: RoutesPaths.roles,
        icon: <IconUsers className="text-sidebar-foreground" />,
    },
    {
        label: "Empresa",
        href: RoutesPaths.company,
        icon: <IconCompany className="text-sidebar-foreground" />,
    },
    {
        label: "Seguridad",
        href: RoutesPaths.security,
        icon: <IconUsers className="text-sidebar-foreground" />,
    },
];

const EMAIL_SIDEBAR_ITEMS: SidebarItem[] = [
    {
        label: "Redactar",
        href: `${RoutesPaths.notifications}?folder=inbox&compose=1`,
        icon: <IconBell className="text-sidebar-foreground" />,
    },
    {
        label: "Email",
        href: `${RoutesPaths.notifications}?folder=inbox`,
        icon: <IconBell className="text-sidebar-foreground" />,
        children: [
            {
                label: "Recibidos",
                href: `${RoutesPaths.notifications}?folder=inbox`,
            },
            {
                label: "Destacados",
                href: `${RoutesPaths.notifications}?folder=starred`,
            },
            {
                label: "Enviados",
                href: `${RoutesPaths.notifications}?folder=sent`,
            },
            {
                label: "Borradores",
                href: `${RoutesPaths.notifications}?folder=drafts`,
            },
            {
                label: "Papelera",
                href: `${RoutesPaths.notifications}?folder=trash`,
            },
        ],
    },
];

export const getSidebarItems = (pathname?: string): SidebarItem[] => {
  if (pathname?.startsWith(RoutesPaths.notifications)) return EMAIL_SIDEBAR_ITEMS;
  return SIDEBAR_ITEMS;
};

const normalizePath = (path: string) => path.replace(/\/+$/, "") || "/";

export const getSidebarTitleByPath = (pathname: string): string | null => {
  const normalizedPath = normalizePath(pathname);
  const activeItems = getSidebarItems(pathname);

  const search = (items: SidebarItem[]): string | null => {
    for (const item of items) {
      if (item.href && normalizePath(item.href) === normalizedPath) return item.label;
      if (item.children?.length) {
        const nested = search(item.children);
        if (nested) return nested;
      }
    }
    return null;
  };

  return search(activeItems);
};


