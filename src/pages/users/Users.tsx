import { useCallback, useMemo, useState } from "react";
import { ArrowBigRightDash, ArrowBigLeftDash, RotateCcwSquare, Eraser } from "lucide-react";
import { usePagination } from "@/hooks/usePagination";
import { useFilter } from "@/hooks/useFilter";
import { useUsers } from "@/hooks/useUser";
import type { UserRow } from "@/hooks/useUser";
import { Modal } from "@/components/settings/modal";
import { UserForm } from "./components/users/formUser";
import { env } from "@/env";
import TagUser from "./components/users/tagUser";
import UsersNavbar from "./components/users/navbar";
import ItemMobile from "./components/users/itemMobile"

export default function Users() {
    const [role, setRole] = useState("");
    const [check, setCheck] = useState(false);
    const [openModal, setOpenModal] = useState(false);

    const { totals, users, loading, error, showUsersActive, toggleActive, removeUser, restore } = useUsers();
    const { query, setQuery, filteredData } = useFilter(users, ["user_name", "user_email"]);

    const buildAvatarSrc = (raw?: string | null, apiBaseUrl?: string) => {
        const v = raw?.trim();
        if (!v) return "";
        if (/^https?:\/\//i.test(v)) return v;
        return `${apiBaseUrl ?? ""}${v.startsWith("/") ? v : `/${v}`}`;
    };

    const closeModal = useCallback(() => {
        setOpenModal(false);
    }, []);

    const roleFiltered = useMemo(() => {
        return role ? filteredData.filter((u: UserRow) => u.roleId === role || u.rol === role) : filteredData;
    }, [filteredData, role]);

    const { paginatedData, page, totalPages, setPage } = usePagination(roleFiltered, 10);

    return (
        <div className="h-screen bg-white flex flex-col overflow-hidden">
            <div className="relative px-10 py-4 border-b border-black/10 shrink-0">
                <h1 className="text-3xl font-semibold text-gray-700">Modulo usuarios</h1>
            </div>
            <TagUser totals={totals} />

            <div className="px-10 flex flex-col flex-1 overflow-hidden mb-2">
                <UsersNavbar
                    query={query}
                    setQuery={setQuery}
                    role={role}
                    setRole={setRole}
                    page={page}
                    setPage={setPage}
                    check={check}
                    setCheck={setCheck}
                    toggleActive={toggleActive}
                    setOpenModal={setOpenModal}
                    loading={loading}
                    error={error}
                />
                <div
                    className="mt-1 w-full flex-1 overflow-y-auto md:overflow-x-hidden overflow-x-auto rounded-sm
                    shadow-[0_2px_6px_0_hsla(0,0%,0%,0.4)] hidden md:block bg-gray-100
                    [scrollbar-width:thin]
                    [&::-webkit-scrollbar]:w-[6px]
                    [&::-webkit-scrollbar-track]:bg-transparent
                    [&::-webkit-scrollbar-thumb]:bg-black/20
                    hover:[&::-webkit-scrollbar-thumb]:bg-black/30"
                >
                    <div className="w-full h-full">
                        <table className="w-full min-h-20 border-separate border-spacing-0 table-fixed">
                            <thead className="bg-[#21b8a6] font-semibold text-md sticky top-0 z-20">
                                <tr className="h-11">
                                    <th className="px-5 text-left text-white w-[25%]">Nombre</th>
                                    <th className="px-5 text-left text-white w-[35%]">Email</th>
                                    <th className="px-5 text-left text-white w-[20%]">Rol</th>
                                    <th className="px-5 text-center text-white w-[20%]">Opciones</th>
                                </tr>
                            </thead>

                            <tbody>
                                {paginatedData.length === 0 && !loading && (
                                    <tr className="h-16">
                                        <td colSpan={4} className="px-5 py-10">
                                            <div className="text-center">
                                                <p className="text-sm font-medium text-gray-700">No hay usuarios</p>
                                            </div>
                                        </td>
                                    </tr>
                                )}

                                {paginatedData.map((user) => (
                                    <tr key={user.user_id} className="group h-11 transition-colors odd:bg-green-50 even:bg-white">
                                        <td className="px-5 py-1">
                                            <p className="text-sm font-semibold text-gray-700">{user.user_name}</p>
                                        </td>

                                        <td className="px-5 py-1">
                                            <p className="text-sm font-semibold text-gray-700">{user.user_email}</p>
                                        </td>

                                        <td className="px-5 py-1">
                                            <span className="inline-flex items-center rounded-xl bg-gray-50 px-5 py-1 text-sm font-semibold text-gray-700">{user.rol}</span>
                                        </td>

                                        <td className="px-5 py-1">
                                            <div className="flex justify-center">
                                                <div className="flex items-center gap-0">
                                                    {showUsersActive ? (
                                                        <button
                                                            className="w-11 h-8 rounded-xl bg-red-100 ring-1 ring-red-400 hover:bg-red-200 cursor-pointer
                                                            text-[#d63737ba] hover:text-red-500 text-sm focus:border-[#21b8a6]
                                                            focus:ring-4 focus:ring-[#21b8a6]/20 outline-none"
                                                            onClick={() => void removeUser(user.user_id)}
                                                            aria-label="Desactivar usuario"
                                                        >
                                                            <Eraser size={20} className="ml-3" />
                                                        </button>
                                                    ) : (
                                                        <button
                                                            className="w-11 h-8 rounded-xl bg-blue-100 hover:bg-blue-200 cursor-pointer
                                                            text-[#4f60e5b2] hover:text-blue-500 text-lg ring-1 ring-blue-400 focus:border-[#21b8a6]
                                                            focus:ring-4 focus:ring-[#21b8a6]/20 outline-none"
                                                            onClick={() => void restore(user.user_id)}
                                                            aria-label="Restaurar usuario"
                                                        >
                                                            <RotateCcwSquare size={20} className="ml-3" />
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:hidden mt-2 overflow-y-auto">
                    {paginatedData.length === 0 && !loading && (
                        <div className="bg-gray-100 space-y-2 p-4 rounded-lg shadow">
                            <p className="text-sm font-medium text-center text-gray-700">No hay usuarios</p>
                        </div>
                    )}

                    {roleFiltered.map((user) => {
                        const avatarSrc = buildAvatarSrc(user.avatarUrl, env.apiBaseUrl);
                        return <ItemMobile key={user.user_id} user={user} avatarSrc={avatarSrc} showUsersActive={showUsersActive} onRemove={removeUser} onRestore={restore} />;
                    })}
                </div>
                <div className="mt-2 hidden md:flex items-center justify-center shrink-0">
                    <div className="inline-flex items-center gap-3 rounded-2xl bg-gray-200 px-4 py-2">
                        <button
                            className="inline-flex h-7 w-7 items-center justify-center rounded-xl bg-white text-gray-700
                            hover:bg-gray-200 hover:text-gray-900 disabled:opacity-40 disabled:hover:bg-gray-50 cursor-pointer focus:border-[#21b8a6]
                            focus:ring-4 focus:ring-[#21b8a6]/20 outline-none"
                            disabled={page === 1}
                            onClick={() => setPage(page - 1)}
                            aria-label="Página anterior"
                        >
                            <ArrowBigLeftDash size={18} />
                        </button>

                        <span className="text-sm font-medium text-gray-700">
                            Página <span className="text-gray-900">{page}</span> de <span className="text-gray-900">{totalPages}</span>
                        </span>

                        <button
                            className="inline-flex h-7 w-7 items-center justify-center rounded-xl bg-white text-gray-700
                            hover:bg-gray-200 hover:text-gray-900 disabled:opacity-40 disabled:hover:bg-gray-50 cursor-pointer focus:border-[#21b8a6]
                            focus:ring-4 focus:ring-[#21b8a6]/20 outline-none"
                            disabled={page === totalPages || totalPages === 0}
                            onClick={() => setPage(page + 1)}
                            aria-label="Página siguiente"
                        >
                            <ArrowBigRightDash size={18} />
                        </button>
                    </div>
                </div>
            </div>

            {openModal && (
                <Modal onClose={closeModal} title="Crear usuario" className="max-w-lg">
                    <UserForm closeModal={closeModal} />
                </Modal>
            )}
        </div>
    );
}
