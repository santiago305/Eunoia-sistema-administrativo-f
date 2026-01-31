import { useMemo, useState } from "react";
import SessionsDeviceCard from "./components/sessions/SessionsDeviceCard";
import SessionsHeader from "./components/sessions/SessionsHeader";
import SessionsQuickActions from "./components/sessions/SessionsQuickActions";
import SessionsSecurityTip from "./components/sessions/SessionsSecurityTip";
import SessionsSummaryCard from "./components/sessions/SessionsSummaryCard";
import type { Session } from "./components/sessions/types";

export default function SessionsUsers() {
  const securityTips = useMemo(
    () => [
      "Si notas actividad extraña, cierra las sesiones y cambia tu contraseña.",
      "¿Algo no cuadra? Cierra sesiones abiertas y actualiza tu clave.",
      "Ante cualquier sospecha, finaliza sesiones y renueva tu contraseña.",
      "Si no reconoces un acceso, ciérralo y cambia tu contraseña.",
      "Protege tu cuenta: cierra sesiones desconocidas y actualiza tu clave.",
      "Si ves un dispositivo raro, cierra esa sesión y cambia tu contraseña.",
      "Mantén tu cuenta segura: revisa sesiones y renueva la contraseña.",
      "¿Actividad inusual? Cierra sesiones y actualiza tu contraseña ahora.",
      "Si algo se ve fuera de lugar, cierra sesiones y cambia tu clave.",
      "Revisa tus sesiones y actualiza la contraseña si detectas algo sospechoso.",
    ],
    []
  );
  const randomTip = useMemo(() => {
    const index = Math.floor(Math.random() * securityTips.length);
    return securityTips[index];
  }, [securityTips]);
  const sessions = useMemo<Session[]>(
    () => [
      {
        id: "s1",
        deviceName: "PC de escritorio",
        browser: "Chrome",
        os: "Windows",
        location: "Piura, PE",
        ip: "190.12.**.**",
        lastActive: "Ahora mismo",
        isCurrent: true,
      },
      {
        id: "s2",
        deviceName: "iPhone",
        browser: "Safari",
        os: "iOS",
        location: "Piura, PE",
        ip: "190.12.**.**",
        lastActive: "Hace 18 min",
        isCurrent: false,
      },
    ],
    []
  );

  const [revokingId, setRevokingId] = useState<string | null>(null);
  const [revokingAll, setRevokingAll] = useState(false);

  const activeCount = sessions.length;
  const otherCount = sessions.filter((s) => !s.isCurrent).length;

  const onRevoke = async (id: string) => {
    try {
      setRevokingId(id);
      await new Promise((r) => setTimeout(r, 500));
    } finally {
      setRevokingId(null);
    }
  };

  const onRevokeAllOthers = async () => {
    try {
      setRevokingAll(true);
      await new Promise((r) => setTimeout(r, 700));
    } finally {
      setRevokingAll(false);
    }
  };

  return (
    <div className="w-full h-full min-h-screen bg-white text-black">
      <SessionsHeader
        title="Sesiones activas"
        subtitle="Revisa dónde está abierta tu cuenta y cierra accesos que no reconozcas."
      />

      {/* Content */}
      <div className="w-full px-6 py-6 space-y-6">
        {/* Summary and quick actions */}
        <div className="w-full flex flex-col lg:flex-row gap-4">
          <SessionsSummaryCard activeCount={activeCount} otherCount={otherCount} />
          <SessionsQuickActions
            otherCount={otherCount}
            revokingAll={revokingAll}
            onRevokeAllOthers={onRevokeAllOthers}
          />
        </div>

        {/* Devices grid */}
        <div>
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-sm font-semibold">Dispositivos</h2>
            <div className="text-xs text-black/60">
              Última actividad y ubicación aproximada
            </div>
          </div>

          <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 2xl:grid-cols-3 gap-4">
            {sessions.map((s) => (
              <SessionsDeviceCard
                key={s.id}
                session={s}
                revokingId={revokingId}
                onRevoke={onRevoke}
              />
            ))}
          </div>
        </div>

        {/* Footer tip - solo si hay más de 1 sesión */}
        {sessions.length > 1 && (
          <SessionsSecurityTip tip={randomTip} />
        )}
      </div>
    </div>
  );
}
