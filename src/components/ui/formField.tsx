import { FloatingInput } from "@/components/FloatingInput";
import type { FieldValues, Path, UseFormRegister } from "react-hook-form";

interface FormFieldProps<TFieldValues extends FieldValues> {
  name: Path<TFieldValues>;
  label: string;
  placeholder?: string;
  type?: string;
  register: UseFormRegister<TFieldValues>;
  error?: string;
}

export default function FormField<TFieldValues extends FieldValues>({
  name,
  label,
  placeholder = "",
  type = "text",
  register,
  error,
}: FormFieldProps<TFieldValues>) {
  const { ref, ...field } = register(name);

  return (
    <FloatingInput
      ref={ref}
      {...field}
      name={String(name)}
      label={label}
      type={type}
      defaultValue=""
      title={placeholder || undefined}
      autoComplete={type === "password" ? "current-password" : undefined}
      error={error}
    />
  );
}


