/**
 * Metadata de las rutas de la aplicación para control de navegación y permisos.
 */
export interface RouteMetadata {
  path: string;
  name: string;
  isPublic?: boolean;               // Ruta pública accesible sin autenticación
  isAuthRoute?: boolean;            // Ruta de autenticacion
  isProtected?: boolean;            // Ruta protegida (requiere autenticación)
  rolesAllowed?: string[];          // Roles permitidos para acceder (futuro control de roles)
}
