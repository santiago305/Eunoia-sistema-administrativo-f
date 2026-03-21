import { forwardRef } from "react";

type Props = {
    type?: string;
    placeholder?: string;
    error?: string;
    className?: string;
};

export const FormInput = forwardRef<HTMLInputElement, Props>(
    ({ type = "text", placeholder, error, className, ...props }, ref) => {
        return (
            <div>
                <input
                    ref={ref}
                    type={type}
                    placeholder={placeholder}
                    className={`h-10 w-full rounded-xl bg-gray-100 px-3 text-[14px] text-gray-600 outline-none transition
                    focus:border-primary focus:ring-4 focus:ring-primary/20 focus:text-gray-800
                    placeholder:text-gray-500 ${className ?? ""}`}
                    {...props}
                />

                <p
                    className={`ml-1 mt-1 text-start text-[12px] text-red-400 ${
                        error ? "visible" : "invisible"
                    }`}
                >
                    {error ?? "placeholder"}
                </p>
            </div>
        );
    }
);

FormInput.displayName = "FormInput";