// src/modules/users/components/users/user-card.tsx
import { Eraser, RotateCcwSquare } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { getInitials } from "@/utils/getInitials";

type Props = {
    user: {
        user_id: string;
        user_name: string;
        user_email: string;
        rol?: string | null;
        avatarUrl?: string | null;
    };

    avatarSrc?: string; 
    showUsersActive: boolean;

    onRemove: (userId: string) => void | Promise<void>;
    onRestore: (userId: string) => void | Promise<void>;
};

export default function ItemMobile({ user, avatarSrc, showUsersActive, onRemove, onRestore }: Props) {
    return (
        <div
            className="bg-gray-100 p-4 rounded-lg shadow-[inset_0_2px_6px_hsla(0,0%,0%,.12)]
            min-h-[110px] flex flex-col justify-between"
                >
            <div className="flex items-start gap-3">
                <div className="shrink-0">
                    <div
                        className="h-20 w-20 bg-gray-50 overflow-hidden rounded-lg
                        shadow-[0_2px_6px_hsla(0,0%,0%,.12)] flex items-center justify-center"
                                >
                        {avatarSrc ? (
                            <img src={avatarSrc} alt={user.user_name} className="h-full w-full object-cover" />
                        ) : (
                            <Avatar className="h-20 w-20 p-1">
                                <AvatarFallback className="bg-primary text-primary-foreground text-3xl font-medium">{getInitials(user.user_name)}</AvatarFallback>
                            </Avatar>
                        )}
                    </div>
                </div>

                <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between">
                        <span className="mt-2 text-xs font-medium uppercase tracking-wider text-gray-800 bg-gray-200 rounded-md py-[2px] px-2">{user.rol ?? "-"}</span>

                        <div className="flex items-center">
                            {showUsersActive ? (
                                <button
                                className="h-7 rounded-xl bg-red-100 ring-1 ring-red-400 hover:bg-red-200 cursor-pointer
                                text-[#d63737ba] hover:text-red-500 text-md px-3
                                focus:border-[#21b8a6] focus:ring-4 focus:ring-[#21b8a6]/20 outline-none"
                                    onClick={() => void onRemove(user.user_id)}
                                    aria-label="Desactivar usuario"
                                >
                                    <Eraser size={18} />
                                </button>
                            ) : (
                                <button
                                    className="h-7 rounded-xl bg-blue-100 hover:bg-blue-200 cursor-pointer
                                    text-[#4f60e5b2] hover:text-blue-500 text-lg ring-1 ring-blue-400 px-3
                                    focus:border-[#21b8a6] focus:ring-4 focus:ring-[#21b8a6]/20 outline-none"
                                    onClick={() => void onRestore(user.user_id)}
                                    aria-label="Restaurar usuario"
                                >
                                    <RotateCcwSquare size={18} />
                                </button>
                            )}
                        </div>
                    </div>

                    <p className="mt-1 font-semibold text-md text-gray-800 truncate text-start">{user.user_name}</p>
                    <p className="mt-1 text-xs text-gray-500 truncate text-start">{user.user_email}</p>
                </div>
            </div>
        </div>
    );
}
