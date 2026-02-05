import { useCallback, useMemo, useState } from "react";
import { ArrowBigRightDash, ArrowBigLeftDash, RotateCcwSquare, Eraser, UserRoundPlus, UserRoundCheck, UserRoundX, UserRound } from "lucide-react";
import { usePagination } from "@/hooks/usePagination";
import { useFilter } from "@/hooks/useFilter";
import { useUsers}  from "@/hooks/useUser";
import type { UserRow } from "@/hooks/useUser";
import { RoleSelect } from "./components/selectRoles";
import { Modal } from "@/components/settings/modal";
import { UserForm } from "./components/formUser";
import { Avatar, AvatarFallback} from "@/components/ui/avatar";
import { env } from "@/env";
import { getInitials } from "@/utils/getInitials";



export default function Users() {
    const [role, setRole] = useState("");
    const [check, setCheck] = useState(false);
    const [openModal, setOpenModal] = useState(false);

    const { totals ,users, loading, error, showUsersActive, toggleActive, removeUser, restore } = useUsers();
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
            <div className="w-full h-40 grid grid-cols-3 gap-4 px-10 items-center">
                <div className="justify-center hidden md:flex">
                    <div className="w-[350px] h-[120px] bg-[#f1fff5] border-e-[#21b8a6] border-e-6 rounded-2xl">
                        <div className="pb-4">
                            <p className="pl-4 pt-4 text-lg text-gray-600 font-semibold font-sans text-start">Total desabilitados</p>
                            <span className="pl-4  text-6xl text-gray-700 font-semibold font-sans text-start flex">
                                {totals.inactive}
                                <UserRoundX className="ml-1 p-2 mt-4 bg-red-500 rounded-full text-white " size={45} />
                            </span>
                        </div>
                    </div>
                </div>

                <div className="justify-center hidden md:flex">
                    <div className="w-[350px] h-[120px] bg-[#f1fff5] rounded-2xl border-e-[#21b8a6] border-e-6">
                        <div className="pb-4">
                            <p className="pl-4 pt-4 text-lg text-gray-600 font-semibold font-sans text-start">Total activos</p>
                            <span className="pl-4  text-6xl text-gray-700 font-semibold font-sans text-start flex">
                                {totals.active}
                                <UserRoundCheck className="ml-1 p-2 mt-4 bg-blue-500 rounded-full text-white " size={45} />
                            </span>
                        </div>
                    </div>
                </div>

                <div className="justify-center hidden md:flex">
                    <div className="w-[350px] h-[120px] bg-[#f1fff5] rounded-2xl border-e-[#21b8a6] border-e-6">
                        <div className="pb-4">
                            <p className="pl-4 pt-4 text-lg text-gray-600 font-semibold font-sans text-start">Total usuarios</p>
                            <span className="pl-4  text-6xl text-gray-700 font-semibold font-sans text-start flex">
                                {totals.total}
                                <UserRound className="ml-1 p-2 mt-4 bg-[#107168b7] rounded-full text-white " size={45} />
                            </span>
                        </div>
                    </div>
                </div>
                <div className="md:hidden justify-center flex">
                    <div className="w-[250px] h-[80px] bg-[#f1fff5] border-e-[#21b8a6] border-e-6 rounded-2xl">
                        <div className="pb-4">
                            <span className="pl-4  text-2xl text-gray-700 font-semibold font-sans text-start flex">
                                45
                                <UserRoundX className="ml-1 p-2 mt-4 bg-red-500 rounded-full text-white " size={45} />
                            </span>
                        </div>
                    </div>
                </div>
                <div className="justify-center flex md:hidden">
                    <div className="w-[250px] h-[80px] bg-[#f1fff5] rounded-2xl border-e-[#21b8a6] border-e-6">
                        <div className="pb-4">
                            <span className="pl-4  text-2xl text-gray-700 font-semibold font-sans text-start flex">
                                45
                                <UserRoundCheck className="ml-1 p-2 mt-4 bg-blue-500 rounded-full text-white " size={45} />
                            </span>
                        </div>
                    </div>
                </div>

                <div className="flex justify-center md:hidden">
                    <div className="w-[250px] h-[80px] bg-[#f1fff5] rounded-2xl border-e-[#21b8a6] border-e-6">
                        <div className="pb-4">
                            <span className="pl-4  text-2xl text-gray-700 font-semibold font-sans text-start flex">
                                45
                                <UserRound className="ml-1 p-2 mt-4 bg-[#107168b7] rounded-full text-white " size={45} />
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            <div className="px-10 flex flex-col flex-1 overflow-hidden mb-2">
                <div className="md:flex block gap-2 mt-1 shrink-0 mb-1">
                    <input
                        type="email"
                        placeholder="Buscar por nombre o correo"
                        value={query}
                        onChange={(e) => {
                            setQuery(e.target.value);
                            setPage(1);
                        }}
                        className="h-12 w-70 ms:w-[50%] rounded-xl bg-gray-100 text-gray-500 px-4 text-lg outline-none focus:border-[#21b8a6]
                            focus:ring-4 focus:ring-[#21b8a6]/20 focus:text-gray-800"
                    />

                    <div className="md:w-60 w-70 ms:w-[50%] md:mt-0 mt-2">
                        <RoleSelect
                            value={role}
                            onChange={(v) => {
                                setRole(v);
                                setPage(1);
                            }}
                        />
                    </div>
                    <div className="flex gap-2 md:mt-0 mt-0 justify-center">
                        <button
                            type="button"
                            className={` 
                                ${check ? "bg-blue-500 hover:bg-blue-400 w-28 md:w-40" : "bg-red-500 hover:bg-red-400 w-33 md:w-50"}
                                h-[47px] rounded-xl cursor-pointer flex text-md font-semibold text-white
                                p-3 overflow-hidden focus:border-[#21b8a6]
                                focus:ring-4 focus:ring-[#21b8a6]/20 outline-none`}
                            onClick={() => {
                                const next = !check;
                                setCheck(next);
                                void toggleActive(!next);
                                setPage(1);
                            }}
                        >
                            {!check ? (
                                <>
                                    <span className="hidden md:block">Listar desabilitados</span>
                                    <span className="md:hidden">Desactivos</span>
                                    <UserRoundX className="ml-1 pb-1" size={30} />
                                </>
                            ) : (
                                <>
                                    <span className="hidden md:block">Listar Activos</span>
                                    <span className="md:hidden">Activos</span>
                                    <UserRoundCheck className="ml-2 mr-0 pb-1" size={30} />
                                </>
                            )}
                        </button>

                        <button
                            type="button"
                            className={`h-[47px] w-28 md:w-41  rounded-xl bg-[#107168b7] hover:bg-[#067d71f8]
                            cursor-pointer flex text-md font-semibold text-white  overflow-hidden p-3 focus:border-[#21b8a6]
                            focus:ring-4 focus:ring-[#21b8a6]/20 `}
                            onClick={() => {
                                setOpenModal(true);
                            }}
                        >
                            <span className="hidden md:block">Crear Usuario</span>
                            <span className="md:hidden">Crear</span>
                            <UserRoundPlus size={30} className="ml-2 pb-1" />
                        </button>
                    </div>
                </div>

                <div className="ml-10 shrink-0">
                    {error ? <p className="text-sm text-red-600">{error}</p> : null}
                    {loading ? <p className="text-sm text-gray-500">Cargando...</p> : null}
                </div>

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
                            <thead className="bg-[#21b8a6] font-semibold text-[18px] sticky top-0 z-20">
                                <tr className="h-12">
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
                                    <tr key={user.user_id} className="group h-13 transition-colors odd:bg-green-50 even:bg-white">
                                        <td className="px-5 py-1">
                                            <p className="text-md font-semibold text-gray-700">{user.user_name}</p>
                                        </td>

                                        <td className="px-5 py-1">
                                            <p className="text-md font-semibold text-gray-700">{user.user_email}</p>
                                        </td>

                                        <td className="px-5 py-1">
                                            <span className="inline-flex items-center rounded-xl bg-gray-50 px-5 py-1 text-md font-semibold text-gray-700">{user.rol}</span>
                                        </td>

                                        <td className="px-5 py-1">
                                            <div className="flex justify-center">
                                                <div className="flex items-center gap-2">
                                                    {showUsersActive ? (
                                                        <button
                                                            className="w-full h-10 rounded-xl bg-red-100 ring-1 ring-red-400 hover:bg-red-200 cursor-pointer
                                                            text-[#d63737ba] hover:text-red-500 px-4 text-md focus:border-[#21b8a6]
                                                            focus:ring-4 focus:ring-[#21b8a6]/20 outline-none"
                                                            onClick={() => void removeUser(user.user_id)}
                                                            aria-label="Desactivar usuario"
                                                        >
                                                            <Eraser size={20} />
                                                        </button>
                                                    ) : (
                                                        <button
                                                            className="w-full h-10 rounded-xl bg-blue-100 hover:bg-blue-200 cursor-pointer
                                                            text-[#4f60e5b2] hover:text-blue-500 px-4 text-lg ring-1 ring-blue-400 focus:border-[#21b8a6]
                                                            focus:ring-4 focus:ring-[#21b8a6]/20 outline-none"
                                                            onClick={() => void restore(user.user_id)}
                                                            aria-label="Restaurar usuario"
                                                        >
                                                            <RotateCcwSquare size={20} />
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
                        return (
                            <div
                                key={user.user_id}
                                className="bg-gray-100 p-4 rounded-lg
                                shadow-[inset_0_2px_6px_hsla(0,0%,0%,.12)]
                                min-h-[110px] flex flex-col justify-between
                                "
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
                                            <span
                                                className="mt-2 text-xs font-medium uppercase tracking-wider
                                                text-gray-800 bg-gray-200 rounded-md  py-[2px]"
                                            >
                                                {user.rol}
                                            </span>
                                            <div className="flex items-center">
                                                {showUsersActive ? (
                                                    <button
                                                        className="h-7 rounded-xl bg-red-100 ring-1 ring-red-400 hover:bg-red-200 cursor-pointer
                                                        text-[#d63737ba] hover:text-red-500  text-md px-3 focus:border-[#21b8a6]
                                                        focus:ring-4 focus:ring-[#21b8a6]/20 outline-none"
                                                        onClick={() => void removeUser(user.user_id)}
                                                    >
                                                        <Eraser size={18} />
                                                    </button>
                                                ) : (
                                                    <button
                                                        className="h-7 rounded-xl bg-blue-100 hover:bg-blue-200 cursor-pointer
                                                            text-[#4f60e5b2] hover:text-blue-500 text-lg ring-1 ring-blue-400 px-3 focus:border-[#21b8a6]
                                                        focus:ring-4 focus:ring-[#21b8a6]/20 outline-none"
                                                        onClick={() => void restore(user.user_id)}
                                                    >
                                                        <RotateCcwSquare size={18} />
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                        <p className="mt-1 font-semibold text-md text-gray-800 truncate text-start">{user.user_name}</p>
                                        <p className="mt-1 text-xs text-gray-500  truncate text-start">{user.user_email}</p>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>

                <div className="mt-2 hidden md:flex items-center justify-center shrink-0">
                    <div className="inline-flex items-center gap-3 rounded-2xl bg-gray-200 px-4 py-2">
                        <button
                            className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-white text-gray-700
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
                            className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-white text-gray-700
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
