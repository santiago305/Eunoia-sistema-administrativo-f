import type { FormEvent } from "react";
import type { UbigeoSelection } from "@/components/UbigeoSelectSection";
import type {
  CompanyFormErrors,
  CompanyFormValues,
} from "@/pages/company/types/companyFormTypes";

export type CompanyFieldUpdater = <K extends keyof CompanyFormValues>(
  field: K,
  value: CompanyFormValues[K],
) => void;

export type CompanyFormSectionProps = {
  formValues: CompanyFormValues;
  formErrors: CompanyFormErrors;
  ubigeoSelection: UbigeoSelection;
  loading: boolean;
  saving: boolean;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onFieldChange: CompanyFieldUpdater;
  onUbigeoChange: (next: UbigeoSelection) => void;
};

export type CompanyLogoBlockProps = {
  loading: boolean;
  name: string;
  logoUrl: string;
  certUrl?: string;
  certLabel?: string;
  certLabelMaxChars?: number;
  onPickLogo: (file: File) => void;
  onPickCert: (file: File) => void;
  disabled?: boolean;
  certDisabled?: boolean;
  companyPrimary: string;
};
