import { IconHome, IconStock, IconUsers, IconWarehouse } from "@/components/dashboard/icons";
import type { SidebarItem } from "@/components/dashboard/types";
import { RoutesPaths } from "@/router/config/routesPaths";

export const getSidebarItems = (): SidebarItem[] => [
    {
        label: "Home",
        href: RoutesPaths.dashboard,
        icon: <IconHome className="text-sidebar-foreground" />,
    },
    {
        label: "Usuarios",
        href: RoutesPaths.users,
        icon: <IconUsers className="text-sidebar-foreground" />,
    },
    {
        label: "Stock",
        href: RoutesPaths.stockSummary,
        icon: <IconStock className="text-sidebar-foreground" />,
        children: [
            {
                label: "Inventario",
                href: "/stock/inventario/1",
            },
            {
                label: "Movimientos",
                href: RoutesPaths.stockMovements,
            },
            {
                label: "Documentos",
                href: RoutesPaths.stockDocuments,
            },
            {
                label: "Transferencias",
                href: RoutesPaths.stockTransfers,
            },
            {
                label: "Ajustes",
                href: RoutesPaths.stockAdjustments,
            },
            {
                label: "Series y Tipos",
                href: RoutesPaths.stockSeriesTypes,
            },
            {
                label: "Reservas",
                href: RoutesPaths.stockReservations,
            },
            {
                label: "Reposicion",
                href: RoutesPaths.stockReplenishment,
            },
        ],
    },
    {
        label: "Catalogo",
        // href: RoutesPaths.catalogSummary,
        icon: <IconStock className="text-sidebar-foreground" />,
        children: [
            {
                label: "Productos",
                href: RoutesPaths.catalogProducts,
            },
            {
                label: "Variantes",
                href: RoutesPaths.catalogVariants,
            },
        ],
    },
    {
        label: "Almacenes",
        href: RoutesPaths.warehouses,
        icon: <IconWarehouse className="text-sidebar-foreground" />,
        children: [
            {
                label: "Ubicaciones",
                href: RoutesPaths.location,
            }
        ],
    },
];
