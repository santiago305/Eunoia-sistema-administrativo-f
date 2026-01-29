import { useCallback, useEffect, useState } from "react";
import axiosInstance from "@/common/utils/axios";
import { API_USERS_GROUP } from "@/services/APIs";

/* =======================
   Types locales
======================= */

type Role = {
  id: string;
  description: string;
};

type User = {
  id: string;
  name: string;
  email: string;
  role?: Role;
  avatarUrl?: string | null;
  createdAt?: string;
  deleted?: boolean;
};

type UserDetailsResponse = {
  data: User;
};

/* =======================
   Hook
======================= */

export const useUserDetails = () => {
  const [userDetails, setUserDetails] = useState<UserDetailsResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const fetchUserDetails = useCallback(async () => {
    setLoading(true);
    try {
      const response = await axiosInstance.get<UserDetailsResponse>(
        API_USERS_GROUP.findOwnUser
      );

      setUserDetails(response.data);
    } catch (error) {
      console.error("Error al cargar los detalles del usuario", error);
      setUserDetails(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUserDetails();
  }, [fetchUserDetails]);

  return {
    userDetails,
    loading,
    refetchUserDetails: fetchUserDetails,
  };
};
