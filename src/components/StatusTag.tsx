export const StatusPill = 
({ active, PRIMARY } :
 { active: boolean, PRIMARY: string }) => (
        <span
            className={[
                "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-medium ring-1 ring-inset",
                active ? "bg-[color:var(--p-50)] text-[color:var(--p-700)] ring-[color:var(--p-200)]" : "bg-rose-50 text-rose-700 ring-rose-200",
            ].join(" ")}
            style={
                active
                    ? ({
                          "--p-50": `${PRIMARY}14`,
                          "--p-200": `${PRIMARY}33`,
                          "--p-700": PRIMARY,
                      } as React.CSSProperties)
                    : undefined
            }
        >
            <span className={["h-1.5 w-1.5 rounded-full", active ? "bg-[color:var(--p-dot)]" : "bg-rose-500"].join(" ")} style={active ? ({ "--p-dot": PRIMARY } as React.CSSProperties) : undefined} />
            {active ? "Activo" : "Inactivo"}
        </span>
    );