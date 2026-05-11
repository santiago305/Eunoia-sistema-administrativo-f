import type { ReactNode } from "react";
import { AuthProvider } from "@/shared/context/AuthProvider";
import { CompanyProvider } from "@/shared/context/CompanyProvider";
import { TooltipProvider } from "@/shared/components/ui/tooltip";
import { NotificationProvider } from "./providers/NotificationProvider";
import { Toaster } from "sileo";
/*
 * Componente raiz de la aplicacion.
 *
 * Este componente configura los providers globales de la aplicacion:
 * - AuthProvider: Proporciona el contexto de autenticacion.
 * - Toaster (Sileo): Gestiona mensajes/toasts globales.
 *
 * Tambien inicializa las rutas principales mediante AppRouter.
 *
 * @returns {JSX.Element} La estructura principal de la aplicacion.
 */
function App({ children }: { children: ReactNode }) {
  return (
    <AuthProvider>
      <CompanyProvider>
        <Toaster position="bottom-left" theme="light"/>
        <NotificationProvider>
          <TooltipProvider delayDuration={200}>{children}</TooltipProvider>
        </NotificationProvider>
      </CompanyProvider>
    </AuthProvider>
  );
}

export default App;


