export const IconButton = ({
        onClick,
        title,
        children,
        tone = "neutral",
        PRIMARY,
        PRIMARY_HOVER,
    }: {
        onClick: (e: React.MouseEvent) => void;
        title: string;
        children: React.ReactNode;
        tone?: "neutral" | "primary" | "danger";
        PRIMARY:string;
        PRIMARY_HOVER:string
    }) => {
        const styles =
            tone === "primary"
                ? "border-[color:var(--p-200)] bg-[color:var(--p)] text-white hover:bg-[color:var(--p-hover)] focus:ring-[color:var(--p-200)]"
                : tone === "danger"
                  ? "border-rose-600/20 bg-rose-50 text-rose-700 hover:bg-rose-100 focus:ring-rose-600/25"
                  : "border-black/10 bg-white hover:bg-black/[0.03] focus:ring-black/10";

        return (
            <button
                type="button"
                title={title}
                aria-label={title}
                onClick={onClick}
                className={["inline-flex h-9 w-9 items-center justify-center rounded-xl border transition", styles, "focus:outline-none focus:ring-2"].join(" ")}
                style={
                    tone === "primary"
                        ? ({
                              "--p": PRIMARY,
                              "--p-hover": PRIMARY_HOVER,
                              "--p-200": `${PRIMARY}33`,
                          } as React.CSSProperties)
                        : undefined
                }
            >
                {children}
            </button>
        );
    };