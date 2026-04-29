import { useContext } from 'react';
import { AuthContext } from '@/shared/context/AuthContext';

/**
 * Hook personalizado para acceder al contexto de autenticación.
 * 
 * Este hook permite acceder de forma segura al contexto de autenticación 
 * en cualquier componente funcional de React. Si no está dentro de un 
 * AuthProvider, lanza un error.
 * 
 * @throws {Error} Si se usa fuera de un AuthProvider.
 * @returns {AuthContextType} El contexto de autenticación.
 */
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};


