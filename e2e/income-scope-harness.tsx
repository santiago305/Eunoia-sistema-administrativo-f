import { useState } from "react";
import { createRoot } from "react-dom/client";
import { UserIncomeScopesModal } from "../src/features/users/components/UserIncomeScopesModal";
import { UserProfileHeader } from "../src/features/users/components/UserProfileHeader";
import type { User } from "../src/features/users/types/users.types";
import "../src/app/styles/globals.css";
import "../src/app/styles/app.css";

const selected = {
  id: "71000000-0000-4000-8000-000000000001",
  name: "Operador de Finanzas",
  email: "finanzas@example.test",
  phone: "",
  role: "Finanzas",
  deleted: false,
  createdAt: "2026-10-12T00:00:00.000Z",
} as User;

function IncomeScopeHarness() {
  const [open, setOpen] = useState(false);
  const [saved, setSaved] = useState(false);
  const canManage = new URLSearchParams(window.location.search).get("canManage") === "true";

  return (
    <main className="mx-auto max-w-5xl p-8">
      <UserProfileHeader
        selected={selected}
        selectedIsDeleted={false}
        canDeleteUsers={false}
        canRestoreUsers={false}
        togglingStatus={false}
        selectedCanManageGrantablePermissions={false}
        actorCanManageGrantablePermissions={false}
        canManageIncomeScopes={canManage}
        onOpenPermissions={() => undefined}
        onOpenGrantablePermissions={() => undefined}
        onOpenIncomeScopes={() => setOpen(true)}
        onDeactivate={() => undefined}
        onRestore={() => undefined}
      />
      {saved ? <p role="status">Alcance guardado</p> : null}
      <UserIncomeScopesModal
        open={open}
        user={selected}
        onClose={() => setOpen(false)}
        onSaved={() => setSaved(true)}
      />
    </main>
  );
}

createRoot(document.getElementById("root")!).render(<IncomeScopeHarness />);
