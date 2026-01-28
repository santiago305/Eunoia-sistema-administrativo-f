import { RouteMetadata } from "../../Router/types/RouterTypes";

export const routesConfig: RouteMetadata[] = [
  // Rutas de autenticacion
  { path: "/login", name: "Login", isAuthRoute: true },


  // 📊 Dashboard y rutas anidadas bajo DashboardLayout
  { path: "/", name: "Dashboard", isProtected: true },
  { path: "/dashboard/products", name: "Dashboard.Products", isProtected: true },
  { path: "/dashboard/products/:id", name: "Dashboard.Product.Show", isProtected: true },
  { path: "/dashboard/profile", name: "Dashboard.Profile", isProtected: true },
  { path: "/dashboard/settings", name: "Dashboard.Settings", isProtected: true },
  
   // 🌐 Ruta de error 404
  { path: "*", name: "Error404", isPublic: true }
];
