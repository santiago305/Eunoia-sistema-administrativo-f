import { useEffect, useState } from "react";
import { PROFILE_PRIMARY, cn, getInitial } from "./profile.utils";

type Props = {
  loading: boolean;
  name: string;
  avatarUrl?: string;
  onPickAvatar: (file: File) => void;
  onRemoveAvatar: () => void;
  disabled?: boolean;
};

export function ProfileAvatarBlock({
  loading,
  name,
  avatarUrl,
  onPickAvatar,
  onRemoveAvatar,
  disabled,
}: Props) {
  const [imageFailed, setImageFailed] = useState(false);
  const hasAvatar = Boolean(avatarUrl) && !imageFailed;

  useEffect(() => {
    setImageFailed(false);
  }, [avatarUrl]);

  return (
    <div className="flex items-center gap-4">
      <div className="relative h-16 w-16 overflow-hidden rounded-2xl border border-black/10 bg-black/5">
        {hasAvatar ? (
          <img
            src={avatarUrl}
            alt="Avatar"
            className="h-full w-full object-cover object-center"
            onError={() => setImageFailed(true)}
          />
        ) : (
          <div
            className="grid h-full w-full place-items-center text-xl font-bold text-white"
            style={{ backgroundColor: PROFILE_PRIMARY }}
            aria-label="Avatar inicial"
          >
            {getInitial(name)}
          </div>
        )}
      </div>

      <div className="flex-1">
        <p className="text-sm font-semibold">{loading ? "Cargando..." : name}</p>
        <p className="text-xs text-black/60">PNG/JPG. Recomendado: cuadrado, buena luz.</p>

        <div className="mt-3 flex flex-wrap gap-2">
          <label
            className={cn(
              "inline-flex cursor-pointer items-center justify-center rounded-xl px-3 py-2 text-xs font-semibold",
              "border border-black/10 bg-white text-black/80",
              "transition active:scale-[0.99]",
              disabled && "opacity-60 cursor-not-allowed"
            )}
          >
            {disabled ? "Subiendo..." : "Subir foto"}
            <input
              type="file"
              accept="image/*"
              className="hidden"
              disabled={disabled}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) onPickAvatar(file);
                e.currentTarget.value = "";
              }}
            />
          </label>

          <button
            type="button"
            disabled={disabled || !hasAvatar}
            onClick={onRemoveAvatar}
            className={cn(
              "inline-flex items-center justify-center rounded-xl px-3 py-2 text-xs font-semibold",
              "border border-black/10 bg-white text-black/60",
              "transition active:scale-[0.99] disabled:opacity-60 disabled:cursor-not-allowed"
            )}
          >
            Quitar
          </button>
        </div>
      </div>
    </div>
  );
}
