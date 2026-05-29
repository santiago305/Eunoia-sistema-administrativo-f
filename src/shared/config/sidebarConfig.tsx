import { 
    IconAgencies,
    IconCampaigns,
    IconCompany,
    IconAccounts,
    IconHome,
    IconOutOrder,
    IconProduction,
    IconPurchase, 
    IconRowMaterial, 
    IconSaleOrder, 
    IconStock, IconUsers, 
    IconWarehouse 
} from "../components/components/dashboard/icons";
import { SidebarItem } from "../components/components/dashboard/types";
import { RoutesPaths } from "@/routes/config/routesPaths";
import { getMailSidebarItems } from "./mailSidebarConfig";

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
        label: "Pedidos",
        icon: <IconSaleOrder className="text-sidebar-foreground" />,
        href: RoutesPaths.saleOrders,
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
                label: "Packs",
                href: RoutesPaths.catalogPacks,
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
        label: "Clientes",
        icon: <IconUsers className="text-sidebar-foreground" />,
        href: RoutesPaths.clients,
    },
    {
        label: "Cuentas",
        icon: <IconAccounts className="text-sidebar-foreground" />,
        children: [
            {
                label: "Usuarios",
                href: RoutesPaths.users,
                icon: <IconUsers className="text-sidebar-foreground" />,
            },
            {
                label: "Permisos",
                href: RoutesPaths.roles,
                icon: <IconUsers className="text-sidebar-foreground" />,
            },
        ],
    },
    {
        label: "Agencias",
        icon: <IconAgencies className="text-sidebar-foreground" />,
        href: RoutesPaths.agencies,
    },
    {
        label: "Enganches",
        icon: <IconCampaigns className="text-sidebar-foreground" />,
        href: RoutesPaths.sources,
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

export const getSidebarItems = (): SidebarItem[] => SIDEBAR_ITEMS;

const normalizePath = (path: string) => path.replace(/\/+$/, "") || "/";

export const getSidebarTitleByPath = (pathname: string): string | null => {
  const normalizedPath = normalizePath(pathname);
  const activeItems = pathname.startsWith(RoutesPaths.notifications)
    ? getMailSidebarItems()
    : getSidebarItems();

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



