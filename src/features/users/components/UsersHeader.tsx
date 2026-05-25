export function UsersHeader({
  onCreateClick,
  canCreateUser,
  total,
}: {
  onCreateClick: () => void;
  canCreateUser: boolean;
  total: number;
}) {
  return (
    <div className="flex flex-col gap-4 border-b border-zinc-100 pb-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        <p className="text-xs uppercase tracking-[0.2em] text-primary">Cuentas</p>
        <h1 className="mt-2 truncate text-2xl font-semibold tracking-tight sm:text-3xl">
          Usuarios
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-500">
          Crea usuarios, consulta su informacion y ajusta permisos individuales sin modificar el rol base.
        </p>
      </div>

      <div className="flex items-center gap-3">
        <div className="min-w-[112px] rounded-sm bg-primary/10 px-4 py-3">
          <p className="text-xs text-zinc-500">Total</p>
          <p className="mt-1 text-2xl font-semibold leading-none text-zinc-950">{total}</p>
        </div>

        {canCreateUser ? (
          <div className="shrink-0">
            <button
              onClick={onCreateClick}
              className="h-11 rounded-sm bg-primary px-4 text-sm font-medium text-primary-foreground transition hover:brightness-110 active:scale-[.98]"
            >
              Nuevo usuario
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}


