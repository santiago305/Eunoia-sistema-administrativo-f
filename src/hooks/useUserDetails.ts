import { useEffect, useState } from "react";
import axiosInstance from "@/common/utils/axios";
import { API_USERS_GROUP } from "@/services/APIs";

export const useUserDetails = () => {
  const [userDetails, setUserDetails] = useState<unknown>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUserDetails = async () => {
      setLoading(true);
      try {

        const response = await axiosInstance.get(API_USERS_GROUP.findOwnUser); 
        setUserDetails(response.data); 
      } catch (error) {
        console.error("Error al cargar los detalles del usuario", error);
      } finally {
        setLoading(false);
      }
    };

    fetchUserDetails(); 
  }, []);

  return { userDetails, loading };
};
