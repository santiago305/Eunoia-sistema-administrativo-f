export type Role = "admin" | "moderator" | "adviser";

export type User = {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: Role;
  createdAt: string;
};

export type RoleOption = {
  id: string;
  description: Role;
};
