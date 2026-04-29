import { createContext } from "react";
import type { Company } from "@/features/company/types/company";

export interface CompanyContextType {
  company: Company | null;
  hasCompany: boolean;
  loading: boolean;
  checked: boolean;
  refreshCompany: () => Promise<Company | null>;
}

export const CompanyContext = createContext<CompanyContextType | undefined>(undefined);
