import axiosInstance from "@/common/utils/axios"
import { API_AUTH_GROUP, API_SESSIONS_GROUP, API_USERS_GROUP } from "./APIs"
import { CreateUserDto, UpdateUserDto } from "@/types/user"

/**
 * Crea un nuevo usuario.
 * @param {CreateUserDto} payload - Datos del usuario.
 * @returns {Promise<any>} Respuesta del servidor.
 */
export const createUser = async (payload: CreateUserDto) => {
  const response = await axiosInstance.post(API_USERS_GROUP.createUser, payload)
  return response.data
}

/**
 * Obtiene todos los usuarios según filtros.
 * @param {Object} params - Parámetros de búsqueda.
 * @returns {Promise<any>} Lista de usuarios.
 */
export const findAll = async (params: {
  page?: number;
  role?: string;
  sortBy?: string;
  order?: 'ASC' | 'DESC';
}) => {
  const response = await axiosInstance.get(API_USERS_GROUP.findAll,{ params })
  return response.data
  
}

export const findDesactive = async (params: {
  page?: number;
  role?: string;
  sortBy?: string;
  order?: "ASC" | "DESC";
}) => {
  const response = await axiosInstance.get(API_USERS_GROUP.findDesactive, { params });
  return response.data;
};

export const updateAvatar = async (id: string, file: File) => {
  const formData = new FormData();
  formData.append("avatar", file); 

  const response = await axiosInstance.post(
    API_USERS_GROUP.updateAvatar(id),
    formData,
    { headers: { "Content-Type": "multipart/form-data" } }
  );

  return response.data;
};

export const changePassword = async (
  id: string,
  payload: { currentPassword: string; newPassword: string }
) => {
  const response = await axiosInstance.patch(
    API_USERS_GROUP.changePassword(id),
    payload
  );
  return response.data;
};

export const verifyPassword = async (
  payload: { currentPassword: string; }
) => {
  const response = await axiosInstance.post(
    API_AUTH_GROUP.verifyPassword,
    payload
  );
  return response.data;
};


/**
 * Obtiene usuarios activos.
 * @param {Object} params - Parámetros de búsqueda.
 * @returns {Promise<any>} Lista de usuarios activos.
 */
export const findActives = async (params: {
  page?: number;
  role?: string;
  sortBy?: string;
  order?: 'ASC' | 'DESC';
}) => {
  const response = await axiosInstance.get(API_USERS_GROUP.findActives,{ params })
  return response.data
}

/**
 * Busca un usuario por ID.
 * @param {string} id - ID del usuario.
 * @returns {Promise<any>} Datos del usuario.
 */
export const findById = async (id: string) => {
  const response = await axiosInstance.get(API_USERS_GROUP.findById(id))
  return response.data
}

/**
 * Busca un usuario por su email.
 * 
 * @param {string} email - Email del usuario.
 * @returns {Promise<any>} Datos del usuario correspondiente.
 */
export const findByEmail = async (email: string) => {
  const response = await axiosInstance.get(API_USERS_GROUP.findByEmail(email));
  return response.data;
};

/**
 * Obtiene la información del usuario autenticado.
 * @returns {Promise<any>} Datos del usuario autenticado.
 */
export const findOwnUser = async () => {
  const response = await axiosInstance.get(API_USERS_GROUP.findOwnUser)
  return response.data
}

/**
 * Actualiza los datos de un usuario.
 * @param {string} id - ID del usuario.
 * @param {UpdateUserDto} payload - Datos a actualizar.
 * @returns {Promise<any>} Respuesta del servidor.
 */

export const updateUser = async (id: string, payload: UpdateUserDto) => {
  const response = await axiosInstance.patch(API_USERS_GROUP.updateUser(id), payload)
  return response.data
}

/**
 * Elimina un usuario.
 * @param {string} id - ID del usuario.
 * @returns {Promise<any>} Respuesta del servidor.
 */
export const deleteUser = async (id: string) => {
  const response = await axiosInstance.patch(API_USERS_GROUP.deleteUser(id))
  return response.data
}

/**
 * Restaura un usuario eliminado.
 * @param {string} id - ID del usuario.
 * @returns {Promise<any>} Respuesta del servidor.
 */
export const restoreUser = async (id: string) => {
  const response = await axiosInstance.patch(API_USERS_GROUP.restoreUser(id))
  return response.data
}
