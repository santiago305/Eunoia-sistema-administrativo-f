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
      <div className="grid grid-cols-1 conteiner__user--form">
          <div>
            <div className="w-full max-w-lg px-10 card__user--form">
                <h1 className="title__user--form">{isEdit ? "Edición de Usuarios" : "Creación de Usuarios"}</h1>
                <UserForm onSubmit={handleSubmit} formId="create-user-form" user={user} />

                <Box sx={{ display: "flex", gap: 1, mt: 2 }}>
                    <Button className="w-50" type="submit" form="create-user-form" variant="contained" 
                      sx={{ textTransform: "none", color: "white", backgroundColor: "#009578", width: "100%" }}>
                        {isEdit ? "Guardar cambios" : "Guardar"}
                    </Button>
                </Box>
            </div>

          </div>
      </div>
  );
}
