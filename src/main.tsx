/**
 * Punto de entrada principal de la aplicación React.
 * 
 * - Se inicializa el árbol de React utilizando `createRoot`.
 * - Se aplican los contextos globales a través del componente `App`.
 * - Se utiliza `RouterProvider` para gestionar la navegación con React Router v7.5.
 * - Se añade `Suspense` para mostrar un fallback mientras se cargan dinámicamente los módulos de rutas.
 * 
 * @remarks
 * La aplicación hace uso de `createBrowserRouter` centralizado en `router/Router.tsx`.
 * 
 * @example
 * ReactDOM.createRoot(document.getElementById('root')!).render(
 *   <StrictMode>
 *     <App>
 *       <Suspense fallback={<>Cargando aplicación...</>}>
 *         <RouterProvider router={router} />
 *       </Suspense>
 *     </App>
 *   </StrictMode>
 * );
 */

import { StrictMode, Suspense } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import { RouterProvider } from 'react-router-dom';
import { router } from './router/Router.tsx'
import './globals.css'
import './app.css'
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App>
      <Suspense fallback={<>Cargando aplicación...</>}>
        <RouterProvider router={router} />
      </Suspense>
    </App>
  </StrictMode>
);
