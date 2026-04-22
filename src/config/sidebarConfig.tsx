import { 
    IconHome,
    IconOutOrder,
    IconProduction,
    IconPurchase, 
    IconRowMaterial, 
    IconStock, IconUsers, 
    IconWarehouse 
} from "@/components/dashboard/icons";
import type { SidebarItem } from "@/components/dashboard/types";
import { RoutesPaths } from "@/router/config/routesPaths";

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
        label: "Seguridad",
        href: RoutesPaths.security,
        icon: <IconUsers className="text-sidebar-foreground" />,
    },
];

export const getSidebarItems = (): SidebarItem[] => SIDEBAR_ITEMS;


