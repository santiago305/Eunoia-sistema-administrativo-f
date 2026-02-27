import { ReactElement } from "react";

export interface PropsUrl {
  children: ReactElement;
}

export interface PrivateRouteProps extends PropsUrl {
  rolesAllowed?: string[];
}
