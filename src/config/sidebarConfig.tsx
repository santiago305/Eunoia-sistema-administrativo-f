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

export const getSidebarItems = (): SidebarItem[] => [
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
        // children: [
        //     {
        //         label: "Nueva Compra",
        //         href: RoutesPaths.purchase,
        //     },
        //     {
        //         label: "Comprobantes",
        //         href: RoutesPaths.purchases,
        //     },
        // ],
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
                label: "Documentos",
                href: RoutesPaths.rowMaterialDocuments,
            },
            {
                label: "Transferencias",
                href: RoutesPaths.rowMaterialTransfer,
            },
            {
                label: "Ajustes",
                href: RoutesPaths.rowMaterialAdjustments,
            },
            // {
            //     label: "Variantes",
            //     href: RoutesPaths.rowVariant,
            // },
            {
                label: "Movimientos",
                href: RoutesPaths.KardexPrima,
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


