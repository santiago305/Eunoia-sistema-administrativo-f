import { FlashMessageRoot } from "./components/flashMessage/FlashMessageRoot";
import { AuthProvider } from "./context/AuthProvider";
import { FlashMessageProvider } from "./context/FlashMessageProvider";
import { TooltipProvider } from "./components/ui/tooltip";
/*
 * Componente raiz de la aplicacion.
 *
 * Este componente configura los providers globales de la aplicacion:
 * - AuthProvider: Proporciona el contexto de autenticacion.
 * - FlashMessageProvider: Gestiona los mensajes flash (notificaciones).
 * - FlashMessageRoot: Componente visual que muestra los mensajes flash.
 *
 * Tambien inicializa las rutas principales mediante AppRouter.
 *
 * @returns {JSX.Element} La estructura principal de la aplicacion.
 */
function App({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <FlashMessageProvider>
        <FlashMessageRoot />
        <TooltipProvider delayDuration={200}>{children}</TooltipProvider>
      </FlashMessageProvider>
    </AuthProvider>
  );
}

export default App;
