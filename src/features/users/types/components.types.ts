export interface UserFormProps {
  closeModal?: () => void;
}

export interface NavbarProps {
  query: string;
  setQuery: (v: string) => void;
  role: string;
  setRole: (v: string) => void;
  page: number;
  setPage: (n: number) => void;
  check: boolean;
  setCheck: (v: boolean) => void;
  toggleActive: (showActive: boolean) => void | Promise<void>;
  setOpenModal: (v: boolean) => void;
  loading?: boolean;
  error?: string | null;
}

export interface MobileUser {
  user_id: string;
  user_name: string;
  user_email: string;
  rol?: string | null;
  avatarUrl?: string | null;
}

export interface ItemMobileProps {
  user: MobileUser;
  avatarSrc?: string;
  showUsersActive: boolean;
  onRemove: (userId: string) => void | Promise<void>;
  onRestore: (userId: string) => void | Promise<void>;
}

export interface TagUserProps {
  totals: {
    inactive: number;
    active: number;
    total: number;
  };
}


