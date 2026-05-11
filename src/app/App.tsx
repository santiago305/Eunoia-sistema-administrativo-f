import type { ReactNode } from "react";
import { AuthProvider } from "@/shared/context/AuthProvider";
import { CompanyProvider } from "@/shared/context/CompanyProvider";
import { useCompany } from "@/shared/hooks/useCompany";
import { TooltipProvider } from "@/shared/components/ui/tooltip";
import { NotificationProvider } from "./providers/NotificationProvider";
import { Toaster } from "sileo";
import { useEffect } from "react";
import { resolveCompanyAssetUrl } from "@/features/company/utils/companyAssets";
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
function FaviconSync() {
  const { company } = useCompany();

  useEffect(() => {
    const iconHref = resolveCompanyAssetUrl(company?.isotypePath) || "/vite.svg";
    let iconLink = document.querySelector("link[rel='icon']") as HTMLLinkElement | null;

    if (!iconLink) {
      iconLink = document.createElement("link");
      iconLink.setAttribute("rel", "icon");
      document.head.appendChild(iconLink);
    }

    iconLink.setAttribute("href", iconHref);
  }, [company?.isotypePath]);

  return null;
}

function App({ children }: { children: ReactNode }) {
  return (
    <AuthProvider>
      <CompanyProvider>
        <FaviconSync />
        <Toaster position="bottom-left" theme="light"/>
        <NotificationProvider>
          <TooltipProvider delayDuration={200}>{children}</TooltipProvider>
        </NotificationProvider>
      </CompanyProvider>
    </AuthProvider>
  );
}

export default App;


