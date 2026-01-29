import { Box, Button } from "@mui/material";
import { useLocation } from "react-router-dom";
import type { CreateUserDto, UpdateUserDto } from "@/types/user";
import { createUser, updateUser } from "@/services/userService";
import { errorResponse, successResponse } from "@/common/utils/response";
import { useFlashMessage } from "@/hooks/useFlashMessage";
import { UserForm } from "@/components/users/formUser";
import './users.css'

type User = {
  id: string;
  name: string;
  email: string;
  deleted: boolean;
  avatarUrl: string;
  createdAt: string;
  role: {
    id: string;
    description: string;
  };
};

type LocationState = {
  mode?: "edit";
  user?: User;
};

export default function CreateUserPage() {
  const { showFlash, clearFlash } = useFlashMessage();
  const location = useLocation();
  const state = location.state as LocationState | null;
  const user = state?.mode === "edit" ? state.user : undefined;
  const isEdit = Boolean(user);

  const handleSubmit = async (data: UpdateUserDto) => {
    clearFlash();
    try {
      if (isEdit && user) {
        const payload: UpdateUserDto = { ...data };
        if (!payload.password?.trim()) delete (payload as any).password;
        await updateUser(user.id, payload);
      } else {
        if (!data.password?.trim()) {
          showFlash(errorResponse("La contraseña es obligatoria"));
          return;
        }
        await createUser(data as CreateUserDto);
      }
      const res = successResponse(
        isEdit ? "Usuario actualizado correctamente" : "Usuario creado correctamente"
      );
      showFlash(res);
      return res;
    } catch (error) {
      const res = errorResponse(
        isEdit ? "No se pudo actualizar el usuario" : "No se pudo crear el usuario"
      );
      showFlash(res);
      throw error;
    }
  };

  return (
      <div className="h-full w-full flex items-start justify-start bg-slate-50 p-6">
          <div className="w-full mt-10 max-w-2xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-lg">
              <div className="border-b border-slate-200 px-6 py-4">
                  <h2 className="text-lg font-semibold text-slate-900">Creación de Usuarios</h2>
                  <p className="mt-1 text-sm text-slate-500">Mantén tu cuenta segura actualizando tu clave.</p>
              </div>
              <div className="px-6 py-5">
                  <UserForm onSubmit={handleSubmit} formId="create-user-form" />

                  <Box sx={{ display: "flex", gap: 1, mt: 2 }}>
                      <Button className="w-50" type="submit" form="create-user-form" variant="contained" sx={{ textTransform: "none", color: "white", backgroundColor: "#009578", width: "100%" }}>
                          {isEdit ? "Guardar cambios" : "Guardar"}
                      </Button>
                  </Box>
              </div>
          </div>
      </div>
  );
}
