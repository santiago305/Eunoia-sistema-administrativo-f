import type { CurrentUser } from "@/types/userProfile";
import { ProfileAvatarBlock } from "./ProfileAvatarBlock";
import { Card, CardHeader, InfoRow } from "./ProfilePrimitives";

type Props = {
  loading: boolean;
  displayName: string;
  avatarUrl: string;
  user: CurrentUser | null;
  savingAvatar: boolean;
  onPickAvatar: (file: File) => void;
  onRemoveAvatar: () => void;
};

export function ProfileSidebarCard({
  loading,
  displayName,
  avatarUrl,
  user,
  savingAvatar,
  onPickAvatar,
  onRemoveAvatar,
}: Props) {
  return (
    <Card>
      <CardHeader title="Foto de perfil" subtitle="Se mostrara en tu cuenta" />
      <div className="p-5 pt-0">
        <ProfileAvatarBlock
          loading={loading}
          name={displayName}
          avatarUrl={avatarUrl}
          onPickAvatar={onPickAvatar}
          onRemoveAvatar={onRemoveAvatar}
          disabled={savingAvatar}
        />

        <div className="mt-5 rounded-xl border border-black/10 bg-white p-4">
          <p className="text-xs uppercase tracking-wide text-black/40">Resumen</p>
          <div className="mt-3 space-y-2">
            <InfoRow label="Nombre" value={displayName} />
            <InfoRow label="Email" value={user?.email ?? "—"} />
            <InfoRow label="Rol" value={user?.role ?? "—"} />
          </div>
        </div>
      </div>
    </Card>
  );
}
