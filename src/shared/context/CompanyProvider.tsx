import { useCallback, useEffect, useState, type ReactNode } from "react";
import type { AxiosError } from "axios";
import { CompanyContext } from "./CompanyContext";
import { useAuth } from "@/shared/hooks/useAuth";
import { getCompany } from "@/shared/services/companyService";
import type { Company } from "@/features/company/types/company";

export const CompanyProvider = ({ children }: { children: ReactNode }) => {
  const { authChecked, isAuthenticated } = useAuth();
  const [company, setCompany] = useState<Company | null>(null);
  const [loading, setLoading] = useState(false);
  const [checked, setChecked] = useState(false);

  const refreshCompany = useCallback(async (): Promise<Company | null> => {
    if (!isAuthenticated) {
      setCompany(null);
      setChecked(true);
      return null;
    }

    setLoading(true);

    try {
      const response = await getCompany();
      setCompany(response);
      return response;
    } catch (error) {
      const status = (error as AxiosError)?.response?.status;
      if (status === 404) {
        setCompany(null);
        return null;
      }

      setCompany(null);
      return null;
    } finally {
      setChecked(true);
      setLoading(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (!authChecked) return;

    if (!isAuthenticated) {
      setCompany(null);
      setChecked(true);
      setLoading(false);
      return;
    }

    void refreshCompany();
  }, [authChecked, isAuthenticated, refreshCompany]);

  return (
    <CompanyContext.Provider
      value={{
        company,
        hasCompany: Boolean(company?.companyId || company?.name || company?.ruc),
        loading,
        checked,
        refreshCompany,
      }}
    >
      {children}
    </CompanyContext.Provider>
  );
};
