import type { SessionDto } from "@/common/utils/sessionDetect";
import { detectSessionMeta } from "@/common/utils/sessionDetect";
import { Trash2 } from "lucide-react";


export const LaptopIcon = () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
        <rect x="2" y="3" width="20" height="14" rx="2" fill="none" stroke="currentColor" strokeWidth="2" />
        <path d="M6 17h12" stroke="currentColor" strokeWidth="2" />
    </svg>
);

export const MobileIcon = () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
        <rect x="5" y="2" width="14" height="20" rx="2" fill="none" stroke="currentColor" strokeWidth="2" />
        <circle cx="12" cy="19" r="1" fill="currentColor" />
    </svg>
);


function DeviceIcon({ type }: { type: string }) {
    return type === "Mobile" ? <MobileIcon /> : <LaptopIcon />;
}

function formatDate(iso: string) {
    const d = new Date(iso);
    return d.toLocaleString();
}

export const SessionItem = ({ session }: { session: SessionDto }) => {
    const meta = detectSessionMeta(session);

    return (
        <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-50 border border-slate-200">
                    <DeviceIcon type={meta.deviceType} />
                </div>

                <div className="min-w-0">
                    <div className="flex items-center gap-2">
                        <span className="font-semibold text-slate-900">{meta.label}</span>
                        <span className="text-xs text-slate-500">({meta.browser})</span>
                    </div>
                    <div className="mt-1 text-xs text-slate-500">Última actividad: {formatDate(session.lastSeenAt)}</div>
                </div>
            </div>

            <div className="flex items-center gap-2">
                <div
                    className="hidden sm:flex items-center justify-center h-10 w-10 rounded-lg bg-slate-50 border border-slate-200 hover:scale-[1.02]
                    cursor-pointer"
                >
                    <Trash2 className="text-red-600" size={25} />
                </div>

                {/* Aquí luego puedes poner botón "Cerrar sesión" */}
                {/* <button className="text-sm font-medium text-red-600 hover:text-red-700">Cerrar</button> */}
            </div>
        </div>
    );
};
