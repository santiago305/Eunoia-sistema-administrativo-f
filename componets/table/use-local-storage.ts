import type { Dispatch, SetStateAction } from 'react';
import { useEffect, useState } from 'react';

export function useLocalStorage<T>(key: string, initialValue: T): readonly [T, Dispatch<SetStateAction<T>>] {
    const [value, setValue] = useState<T>(() => {
        if (typeof window === 'undefined') return initialValue;

        try {
            const item = window.localStorage.getItem(key);
            return item ? (JSON.parse(item) as T) : initialValue;
        } catch {
            return initialValue;
        }
    });

    useEffect(() => {
        if (typeof window === 'undefined') return;

        try {
            window.localStorage.setItem(key, JSON.stringify(value));
        } catch {
            // Evita romper la app si localStorage falla.
        }
    }, [key, value]);

    return [value, setValue] as const;
}
