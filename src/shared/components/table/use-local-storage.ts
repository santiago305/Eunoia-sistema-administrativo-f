import type { Dispatch, SetStateAction } from 'react';
import { useEffect, useState } from 'react';

const LOCAL_STORAGE_EVENT = "codex:local-storage-change";
const LOCAL_STORAGE_WRITE_DELAY_MS = 150;

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

        const timeoutId = window.setTimeout(() => {
            try {
                window.localStorage.setItem(key, JSON.stringify(value));
                window.dispatchEvent(
                    new CustomEvent(LOCAL_STORAGE_EVENT, {
                        detail: { key, value },
                    }),
                );
            } catch {
                // Evita romper la app si localStorage falla.
            }
        }, LOCAL_STORAGE_WRITE_DELAY_MS);

        return () => window.clearTimeout(timeoutId);
    }, [key, value]);

    useEffect(() => {
        if (typeof window === 'undefined') return;

        const syncFromStorage = () => {
            try {
                const item = window.localStorage.getItem(key);
                setValue(item ? (JSON.parse(item) as T) : initialValue);
            } catch {
                setValue(initialValue);
            }
        };

        const handleStorage = (event: StorageEvent) => {
            if (event.key !== key) return;
            syncFromStorage();
        };

        const handleCustomStorage = (event: Event) => {
            const customEvent = event as CustomEvent<{ key?: string; value?: T }>;
            if (customEvent.detail?.key !== key) return;
            if (customEvent.detail.value !== undefined) {
                setValue(customEvent.detail.value);
                return;
            }
            syncFromStorage();
        };

        window.addEventListener("storage", handleStorage);
        window.addEventListener(LOCAL_STORAGE_EVENT, handleCustomStorage as EventListener);

        return () => {
            window.removeEventListener("storage", handleStorage);
            window.removeEventListener(LOCAL_STORAGE_EVENT, handleCustomStorage as EventListener);
        };
    }, [initialValue, key]);

    return [value, setValue] as const;
}
