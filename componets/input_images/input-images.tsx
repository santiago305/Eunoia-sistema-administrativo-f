import { FileAudio2, ImageIcon, UploadCloud, Video, X } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import InputError from '../input-error';
import { Label } from '../ui/label';
import type { InputImagesProps, PreviewItem } from './types';

function getAcceptedTypes(accept: string) {
    return accept
        .split(',')
        .map((type) => type.trim())
        .filter(Boolean);
}

function isFileAccepted(file: File, acceptedTypes: string[]) {
    if (acceptedTypes.length === 0) return true;

    return acceptedTypes.some((type) => {
        if (type.endsWith('/*')) {
            return file.type.startsWith(type.replace('/*', '/'));
        }

        return file.type === type;
    });
}

function detectPreviewKind(file?: File, url?: string, accept?: string): 'image' | 'video' | 'audio' {
    if (file) {
        if (file.type.startsWith('video/')) return 'video';
        if (file.type.startsWith('audio/')) return 'audio';
        return 'image';
    }

    if (url) {
        const cleanUrl = url.toLowerCase();

        if (cleanUrl.endsWith('.mp4') || cleanUrl.endsWith('.webm') || cleanUrl.endsWith('.ogg') || cleanUrl.endsWith('.mov')) {
            return 'video';
        }

        if (cleanUrl.endsWith('.mp3') || cleanUrl.endsWith('.wav') || cleanUrl.endsWith('.m4a') || cleanUrl.endsWith('.aac')) {
            return 'audio';
        }
    }

    if (accept?.includes('audio')) return 'audio';
    if (accept?.includes('video')) return 'video';

    return 'image';
}

export default function InputImages({
    onFilesUpload,
    id = 'file-upload',
    error,
    multiple = false,
    accept = 'image/*',
    label = 'Subir archivo',
    helperText = 'Haz clic para seleccionar o arrastra tus archivos aqui.',
    previewUrls: externalPreviewUrls = [],
    disabled = false,
    maxPreviewHeight = 'h-28',
    resetKey,
}: InputImagesProps) {
    const inputRef = useRef<HTMLInputElement | null>(null);
    const previousUrlsRef = useRef<string[]>([]);

    const [files, setFiles] = useState<File[]>([]);
    const [internalPreviewUrls, setInternalPreviewUrls] = useState<string[]>([]);
    const [isDragging, setIsDragging] = useState(false);

    const acceptedTypes = useMemo(() => getAcceptedTypes(accept), [accept]);

    const clearObjectUrls = () => {
        previousUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
        previousUrlsRef.current = [];
    };

    useEffect(() => {
        return () => {
            previousUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
        };
    }, []);

    useEffect(() => {
        clearObjectUrls();
        setFiles([]);
        setInternalPreviewUrls([]);

        if (inputRef.current) {
            inputRef.current.value = '';
        }
    }, [resetKey]);

    const syncFiles = (selectedFiles: File[]) => {
        if (selectedFiles.length === 0) {
            clearObjectUrls();
            setFiles([]);
            setInternalPreviewUrls([]);
            onFilesUpload([], []);
            return;
        }

        const validFiles = selectedFiles.filter((file) => isFileAccepted(file, acceptedTypes));
        const limitedFiles = multiple ? validFiles : validFiles.slice(0, 1);

        clearObjectUrls();

        const nextPreviewUrls = limitedFiles.map((file) => URL.createObjectURL(file));

        previousUrlsRef.current = nextPreviewUrls;
        setFiles(limitedFiles);
        setInternalPreviewUrls(nextPreviewUrls);
        onFilesUpload(limitedFiles, nextPreviewUrls);
    };

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFiles = event.target.files ? Array.from(event.target.files) : [];
        syncFiles(selectedFiles);
    };

    const handleRemoveItem = (indexToRemove: number) => {
        const nextFiles = files.filter((_, index) => index !== indexToRemove);
        const nextPreviews = internalPreviewUrls.filter((_, index) => index !== indexToRemove);

        const removedUrl = internalPreviewUrls[indexToRemove];
        if (removedUrl) {
            URL.revokeObjectURL(removedUrl);
        }

        previousUrlsRef.current = nextPreviews;
        setFiles(nextFiles);
        setInternalPreviewUrls(nextPreviews);
        onFilesUpload(nextFiles, nextPreviews);

        if (inputRef.current && nextFiles.length === 0) {
            inputRef.current.value = '';
        }
    };

    const openFileDialog = () => {
        if (disabled) return;
        inputRef.current?.click();
    };

    const urlsToShow = externalPreviewUrls.length > 0 ? externalPreviewUrls : internalPreviewUrls;

    const previewItems: PreviewItem[] = urlsToShow.map((url, index) => ({
        url,
        file: files[index],
        kind: detectPreviewKind(files[index], url, accept),
    }));

    return (
        <div className="w-full space-y-2">
            <Label htmlFor={id} className="text-sm font-medium text-foreground">
                {label}
            </Label>

            <input
                ref={inputRef}
                id={id}
                type="file"
                className="hidden"
                onChange={handleFileChange}
                multiple={multiple}
                accept={accept}
                disabled={disabled}
            />

            <button
                type="button"
                onClick={openFileDialog}
                onDragOver={(event) => {
                    event.preventDefault();
                    if (!disabled) setIsDragging(true);
                }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={(event) => {
                    event.preventDefault();
                    setIsDragging(false);

                    if (disabled) return;

                    const droppedFiles = Array.from(event.dataTransfer.files ?? []);
                    syncFiles(droppedFiles);
                }}
                className={[
                    'w-full rounded-xl border border-dashed bg-background p-4 text-left transition-all',
                    'focus:outline-none focus:ring-2 focus:ring-primary/30',
                    disabled
                        ? 'cursor-not-allowed border-border bg-muted/50 opacity-70'
                        : 'cursor-pointer hover:border-primary/50 hover:bg-muted/30',
                    isDragging ? 'border-primary bg-primary/5 ring-2 ring-primary/20' : 'border-border',
                    error ? 'border-red-500 ring-1 ring-red-200/40 dark:ring-red-500/20' : '',
                ].join(' ')}
            >
                <div className="flex items-start gap-3">
                    <div
                        className={[
                            'flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border',
                            error
                                ? 'border-red-200 bg-red-50 text-red-500 dark:border-red-500/20 dark:bg-red-500/10'
                                : 'border-border bg-muted text-muted-foreground',
                        ].join(' ')}
                    >
                        <UploadCloud className="h-5 w-5" />
                    </div>

                    <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-foreground">
                            {multiple ? 'Selecciona uno o varios archivos' : 'Selecciona un archivo'}
                        </p>

                        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{helperText}</p>

                        <p className="mt-2 text-[11px] text-muted-foreground">
                            Permitido: <span className="font-medium">{accept}</span>
                        </p>
                    </div>
                </div>
            </button>

            {error ? <InputError message={error} className="text-xs text-red-500" /> : null}

            {previewItems.length > 0 ? (
                <div className="grid grid-cols-1 gap-3 pt-2 sm:grid-cols-2 xl:grid-cols-3">
                    {previewItems.map((item, index) => (
                        <div
                            key={`${item.url}-${index}`}
                            className="group overflow-hidden rounded-xl border border-border bg-background shadow-sm transition hover:shadow-md"
                        >
                            <div className="relative">
                                {item.kind === 'video' ? (
                                    <video
                                        src={item.url}
                                        className={`w-full object-cover ${maxPreviewHeight}`}
                                        autoPlay
                                        muted
                                        loop
                                        playsInline
                                    />
                                ) : item.kind === 'audio' ? (
                                    <div className={`flex w-full items-center gap-3 bg-muted/60 px-4 ${maxPreviewHeight}`}>
                                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/12 text-primary">
                                            <FileAudio2 className="h-5 w-5" />
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <div className="h-1 w-full bg-border">
                                                <div className="h-full w-1/3 bg-primary" />
                                            </div>
                                            <p className="mt-2 text-[11px] text-muted-foreground">Vista previa de audio</p>
                                        </div>
                                    </div>
                                ) : (
                                    <img
                                        src={item.url}
                                        alt={`preview-${index + 1}`}
                                        className={`w-full object-cover ${maxPreviewHeight}`}
                                    />
                                )}

                                {externalPreviewUrls.length === 0 && !disabled ? (
                                    <button
                                        type="button"
                                        onClick={() => handleRemoveItem(index)}
                                        className="absolute top-2 right-2 inline-flex h-8 w-8 items-center justify-center rounded-full bg-black/60 text-white opacity-0 transition group-hover:opacity-100 hover:bg-black/75"
                                    >
                                        <X className="h-4 w-4" />
                                    </button>
                                ) : null}
                            </div>

                            <div className="flex items-center gap-2 border-t border-border px-3 py-2">
                                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                                    {item.kind === 'video' ? (
                                        <Video className="h-4 w-4" />
                                    ) : item.kind === 'audio' ? (
                                        <FileAudio2 className="h-4 w-4" />
                                    ) : (
                                        <ImageIcon className="h-4 w-4" />
                                    )}
                                </div>

                                <div className="min-w-0 flex-1">
                                    <p className="truncate text-xs font-medium text-foreground">{item.file?.name ?? `Archivo ${index + 1}`}</p>
                                    <p className="text-[11px] text-muted-foreground">
                                        {item.kind === 'video'
                                            ? 'Vista previa de video'
                                            : item.kind === 'audio'
                                              ? 'Archivo de audio'
                                              : 'Vista previa de imagen'}
                                    </p>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            ) : null}
        </div>
    );
}
