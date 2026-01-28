import {
  IconBook,
  IconCalendar,
  IconGauge,
  IconMessage,
  IconSettings,
} from "@tabler/icons-react";

export const userData = {
  user: {
    name: "Usuario",
    email: "usuario@example.com",
    avatar: "/avatars/user.png",
  },
  navMain: [
    { title: "Dashboard", url: "/dashboard", icon: IconGauge },
    { title: "Mensajes", url: "/dashboard/mensajes", icon: IconMessage },
    { title: "Calendario", url: "/dashboard/calendario", icon: IconCalendar },
  ],
  documents: [
    { name: "Guia", url: "/docs/guia", icon: IconBook },
  ],
  navSecondary: [
    { title: "Configuracion", url: "/dashboard/configuracion", icon: IconSettings },
  ],
};
