import { forwardRef, type InputHTMLAttributes } from "react";
import { FloatingInput } from "@/components/FloatingInput";

type Props = {
    label?: string;
    error?: string;
    className?: string;
} & Omit<InputHTMLAttributes<HTMLInputElement>, "value" | "onChange">;

export const FormInput = forwardRef<HTMLInputElement, Props>(
    ({ label, type = "text", placeholder, error, className, ...props }, ref) => {
        return (
            <FloatingInput
                ref={ref}
                label={label ?? placeholder ?? props.name ?? "Campo"}
                name={props.name ?? label ?? "campo"}
                type={type}
                error={error}
                className={className}
                title={placeholder}
                {...props}
            />
        );
    }
);

FormInput.displayName = "FormInput";
