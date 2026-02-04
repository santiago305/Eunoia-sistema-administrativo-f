import { forwardRef } from "react";

type Props = {
    type?: string;
    placeholder?: string;
    error?: string;
    className?: string;
};

export const FormInput = forwardRef<HTMLInputElement, Props>(({ type = "text", placeholder, error, className, ...props }, ref) => {
    return (
        <div>
            <input
                ref={ref}
                type={type}
                placeholder={placeholder}
                className={`h-15 w-full rounded-xl bg-gray-100 text-gray-600 px-4 text-lg outline-none focus:border-[#21b8a6]
                focus:ring-4 focus:ring-[#21b8a6]/20 focus:text-gray-800 placeholder:text-gray-500
                ${className ?? ""}`}
                {...props}
            />

            <p className={`text-sm text-start ml-5 mt-1 text-red-400 ${error ? "visible" : "invisible"}`}>{error ?? "placeholder"}</p>
        </div>
    );
});

FormInput.displayName = "FormInput";
