export type CurrentUser = {
  id: string;
  name: string;
  email: string;
  telefono: string | null;
  avatarUrl?: string | null;
  role: string;
};

export type CurrentUserResponse = {
  type: string;
  message: string;
  data: CurrentUser;
};
