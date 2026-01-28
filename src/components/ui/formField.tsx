import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import FieldError from "./FieldError";
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
  return (
    <div className="grid gap-1">
      <Label htmlFor={name}>{label}</Label>
      <Input {...register(name)} type={type} placeholder={placeholder} />
      <div className="min-h-3 h-auto">
        <FieldError error={error} />
      </div>
    </div>
  );
}
