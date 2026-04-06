import { forwardRef, useMemo, useState, type ChangeEvent, type TextareaHTMLAttributes } from 'react';

type FloatingTextareaProps = {
    label: string;
    name: string;
    value?: string;
    error?: string;
    rows?: number;
    onChange?: (event: ChangeEvent<HTMLTextAreaElement>) => void;
} & Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, 'name' | 'value' | 'onChange' | 'placeholder' | 'rows'>;

export const FloatingTextarea = forwardRef<HTMLTextAreaElement, FloatingTextareaProps>(function FloatingTextarea(
    { label, name, value, error, rows = 4, onChange, disabled, className = '', defaultValue, ...props }: FloatingTextareaProps,
    ref,
) {
    const [uncontrolledValue, setUncontrolledValue] = useState(String(defaultValue ?? ''));

    const resolvedValue = useMemo(() => {
        if (value !== undefined && value !== null) return String(value);
        return uncontrolledValue;
    }, [uncontrolledValue, value]);

    const hasValue = resolvedValue.trim().length > 0;

    return (
        <div className="w-full">
            <div className="relative">
                <textarea
                    ref={ref}
                    id={name}
                    name={name}
                    rows={rows}
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
                        'peer min-h-28 w-full resize-none rounded-lg border bg-background px-3 py-4 text-sm text-foreground outline-none transition-all',
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
                        hasValue ? 'top-0 -translate-y-1/2 text-[10px]' : 'top-4 text-xs',
                        error ? 'text-red-500 peer-focus:text-red-500' : 'text-muted-foreground peer-focus:text-primary',
                        'peer-focus:top-0 peer-focus:-translate-y-1/2 peer-focus:text-[10px]',
                    ].join(' ')}
                >
                    {label}
                </label>
            </div>

            {error ? <p className="mt-1 text-xs text-red-600 dark:text-red-400">{error}</p> : null}
        </div>
    );
});
