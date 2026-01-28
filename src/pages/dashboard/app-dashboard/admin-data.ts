import {
  IconBook,
  IconChartBar,
  IconClipboardList,
  IconFileInvoice,
  IconGauge,
  IconSettings,
  IconUsers,
} from "@tabler/icons-react";

export const adminData = {
  user: {
    name: "Admin User",
    email: "admin@example.com",
    avatar: "/avatars/admin.png",
  },
  navMain: [
    { title: "Dashboard", url: "/dashboard", icon: IconGauge },
    { title: "Usuarios", url: "/dashboard/usuarios", icon: IconUsers },
    { title: "Reportes", url: "/dashboard/reportes", icon: IconChartBar },
    { title: "Tareas", url: "/dashboard/tareas", icon: IconClipboardList },
  ],
  documents: [
    { name: "Manual", url: "/docs/manual", icon: IconBook },
    { name: "Facturas", url: "/docs/facturas", icon: IconFileInvoice },
  ],
  navSecondary: [
    { title: "Configuracion", url: "/dashboard/configuracion", icon: IconSettings },
  ],
};
