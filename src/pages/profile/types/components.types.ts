import type { UseFormReturn } from "react-hook-form";
import type { CurrentUser } from "@/pages/profile/types/userProfile";
import type { PasswordFormValues, ProfileFormValues } from "../components/profile.schemas";

export type ProfileAvatarBlockProps = {
  loading: boolean;
  name: string;
  avatarUrl?: string;
  onPickAvatar: (file: File) => void;
  onRemoveAvatar: () => void;
  disabled?: boolean;
};

export type ProfileInfoFormCardProps = {
  form: UseFormReturn<ProfileFormValues>;
  onSubmit: (e?: React.BaseSyntheticEvent) => Promise<void>;
  saving: boolean;
  loading: boolean;
  hasSession: boolean;
};

export type ProfilePasswordFormCardProps = {
  form: UseFormReturn<PasswordFormValues>;
  onSubmit: (e?: React.BaseSyntheticEvent) => Promise<void>;
  saving: boolean;
  loading: boolean;
};

export type ProfileSidebarCardProps = {
  loading: boolean;
  displayName: string;
  avatarUrl: string;
  user: CurrentUser | null;
  savingAvatar: boolean;
  onPickAvatar: (file: File) => void;
  onRemoveAvatar: () => void;
};

export type FieldProps = React.InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  error?: string;
};


