/**
 * Punto de entrada principal de la aplicacion React.
 *
 * - Se inicializa el arbol de React utilizando `createRoot`.
 * - Se aplican los contextos globales a traves del componente `App`.
 * - Se utiliza `RouterProvider` para gestionar la navegacion con React Router v7.5.
 * - Se anade `Suspense` para mostrar un fallback mientras se cargan dinamicamente los modulos de rutas.
 *
 * @remarks
 * La aplicacion hace uso de `createBrowserRouter` centralizado en `router/Router.tsx`.
 *
 * @example
 * ReactDOM.createRoot(document.getElementById('root')!).render(
 *   <StrictMode>
 *     <App>
 *       <Suspense fallback={<>Cargando aplicacion...</>}>
 *         <RouterProvider router={router} />
 *       </Suspense>
 *     </App>
 *   </StrictMode>
 * );
 */

import { StrictMode, Suspense } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import { RouterProvider } from "react-router-dom";
import { router } from "./router/Router.tsx";
import { HelmetProvider } from "react-helmet-async";
import "./globals.css";
import "./app.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <HelmetProvider>
      <App>
        <Suspense fallback={<>Cargando aplicacion...</>}>
          <RouterProvider router={router} />
        </Suspense>
      </App>
    </HelmetProvider>
  </StrictMode>
);
