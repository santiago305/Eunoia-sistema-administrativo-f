import { useState } from "react";
import { Modal } from "@/shared/components/modales/Modal";
import { FloatingInput } from "@/shared/components/components/FloatingInput";
import { SystemButton } from "@/shared/components/components/SystemButton";

type CreateRoleModalProps = {
  open: boolean;
  saving: boolean;
  onClose: () => void;
  onCreate: (description: string) => Promise<void>;
};

export function CreateRoleModal({ open, saving, onClose, onCreate }: CreateRoleModalProps) {
  const [description, setDescription] = useState("");
  const [error, setError] = useState("");

  const handleClose = () => {
    if (saving) return;
    setDescription("");
    setError("");
    onClose();
  };

  const handleSubmit = async () => {
    const value = description.trim();
    if (value.length < 3) {
      setError("Ingresa un nombre de rol de al menos 3 caracteres.");
      return;
    }
    setError("");
    await onCreate(value);
    setDescription("");
  };

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title="Nuevo rol"
      description="Crea un rol operativo y luego asigna sus permisos."
      className="w-[min(620px,calc(100vw-2rem))] rounded-sm border border-zinc-100"
      headerClassName="border-b-0 bg-white px-5 pt-5 pb-2"
      bodyClassName="px-5 pb-5 pt-2"
      overlayBlur
    >
      <div className="space-y-4">
        <FloatingInput
          label="Nombre del rol"
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          error={error}
        />

        <div className="flex items-center justify-end gap-2 border-t border-zinc-100 pt-4">
          <SystemButton type="button" variant="outline" onClick={handleClose} disabled={saving}>
            Cancelar
          </SystemButton>
          <SystemButton type="button" variant="primary" onClick={() => void handleSubmit()} loading={saving}>
            Crear rol
          </SystemButton>
        </div>
      </div>
    </Modal>
  );
}

