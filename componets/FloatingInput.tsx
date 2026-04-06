import { Eye, EyeOff } from 'lucide-react';
import { forwardRef, useMemo, useState, type ChangeEvent, type InputHTMLAttributes } from 'react';

type FloatingInputProps = {
    label: string;
    name: string;
    value?: string | number;
    error?: string;
    onChange?: (event: ChangeEvent<HTMLInputElement>) => void;
} & Omit<InputHTMLAttributes<HTMLInputElement>, 'name' | 'value' | 'onChange' | 'placeholder'>;

export const FloatingInput = forwardRef<HTMLInputElement, FloatingInputProps>(function FloatingInput(
    { label, name, value, error, onChange, type = 'text', disabled, className = '', defaultValue, ...props }: FloatingInputProps,
    ref,
) {
    const [showPassword, setShowPassword] = useState(false);
    const [uncontrolledValue, setUncontrolledValue] = useState(String(defaultValue ?? ''));

    const resolvedValue = useMemo(() => {
        if (value !== undefined && value !== null) return String(value);
        return uncontrolledValue;
    }, [uncontrolledValue, value]);

    const hasValue = resolvedValue.trim().length > 0;
    const isPassword = type === 'password';

    return (
        <div className="w-full">
            <div className="relative">
                <input
                    ref={ref}
                    id={name}
                    name={name}
                    type={isPassword ? (showPassword ? 'text' : 'password') : type}
                    value={value}
                    defaultValue={defaultValue}
                    onChange={(event) => {
                        if (value === undefined) {
                            setUncontrolledValue(event.target.value);
                        }
                        onChange?.(event);
                    }}
                    disabled={disabled}
                    placeholder=" "
                    className={[
                        'peer h-10 w-full rounded-lg border bg-background px-3 py-2 text-sm text-foreground outline-none transition-all',
                        isPassword ? 'pr-10' : '',
                        error
                            ? 'border-red-500 focus:border-red-500 focus:ring-2 focus:ring-red-200/40 dark:focus:ring-red-500/20'
                            : 'border-border focus:border-primary focus:ring-2 focus:ring-primary/30',
                        disabled ? 'cursor-not-allowed bg-muted text-muted-foreground' : '',
                        className,
                    ].join(' ')}
                    {...props}
                />

                <label
                    htmlFor={name}
                    className={[
                        'pointer-events-none absolute left-3 bg-background px-1 text-xs transition-all duration-200',
                        hasValue ? 'top-0 -translate-y-1/2 text-[10px]' : 'top-1/2 -translate-y-1/2 text-xs',
                        error ? 'text-red-500 peer-focus:text-red-500' : 'text-muted-foreground peer-focus:text-primary',
                        'peer-focus:top-0 peer-focus:-translate-y-1/2 peer-focus:text-[10px]',
                    ].join(' ')}
                >
                    {label}
                </label>

                {isPassword && (
                    <button
                        type="button"
                        onClick={() => setShowPassword((prev) => !prev)}
                        className="absolute top-1/2 right-3 -translate-y-1/2 text-xs text-muted-foreground transition hover:text-foreground"
                    >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                )}
            </div>

            {error && <p className="mt-1 text-xs text-red-600 dark:text-red-400">{error}</p>}
        </div>
    );
});
