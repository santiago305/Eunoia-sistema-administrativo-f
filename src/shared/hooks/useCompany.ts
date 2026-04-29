import { useContext } from "react";
import { CompanyContext } from "@/shared/context/CompanyContext";

export const useCompany = () => {
  const context = useContext(CompanyContext);
  if (context === undefined) {
    throw new Error("useCompany must be used within a CompanyProvider");
  }
  return context;
};
