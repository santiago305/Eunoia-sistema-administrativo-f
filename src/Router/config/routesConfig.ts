
import { RouteMetadata } from "../types/RouterTypes";

// Carga dinámica de componentes

export const routesConfig: RouteMetadata[] = [


  // 🔐 Rutas de autenticación
  { path: "/login", name: "Login", isAuthRoute: true },


  // 📊 Dashboard y rutas anidadas bajo DashboardLayout
  { path: "/dashboard", name: "Dashboard", isProtected: true },
  { path: "/dashboard/products", name: "Dashboard.Products", isProtected: true },
  { path: "/dashboard/products/:id", name: "Dashboard.Product.Show", isProtected: true },
  { path: "/dashboard/profile", name: "Dashboard.Profile", isProtected: true },
  { path: "/dashboard/settings", name: "Dashboard.Settings", isProtected: true },
  
   // 🌐 Ruta de error 404
  { path: "*", name: "Error404", isPublic: true }
];
