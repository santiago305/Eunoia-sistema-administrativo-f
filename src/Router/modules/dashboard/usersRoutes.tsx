import ErrorPage from "@/pages/Error404";
import { RouteObject } from "react-router-dom";
import { } from '../../../pages/settings/Setting'
import Settings  from "../../../pages/settings/Setting";
import Users  from "../../../pages/users/Users";
import Create  from "../../../pages/users/CreateU";
import { RoutesPaths } from "../../../router/config/routesPaths";



export const usersRoutes: RouteObject[] = [
  {
    path: RoutesPaths.users,
    element: (
        <Users />
    ),
    errorElement: <ErrorPage />
  },
  {
    path: RoutesPaths.createUser,
    element: (
        <Create />
    ),
    errorElement: <ErrorPage />
  },
  {
    path: RoutesPaths.settings,
    element: (
        <Settings />
    ),
    errorElement: <ErrorPage />
  }
];

