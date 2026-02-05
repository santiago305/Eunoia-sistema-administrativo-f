// src/modules/users/components/users/navbar-users.tsx
import { RoleSelect } from "@/components/users/selectRoles";
import { UserRoundPlus, UserRoundCheck, UserRoundX } from "lucide-react";

type Props = {
    query: string;
    setQuery: (v: string) => void;
    role: string;
    setRole: (v: string) => void;
    page: number;
    setPage: (n: number) => void;
    check: boolean;
    setCheck: (v: boolean) => void;
    toggleActive: (showActive: boolean) => void | Promise<void>;
    setOpenModal: (v: boolean) => void;
    loading?: boolean;
    error?: string | null;
};

export default function Navbar({ query, setQuery, role, setRole, page, setPage, check, setCheck, toggleActive, setOpenModal, loading, error }: Props) {
    return (
        <div>
            <div className="md:flex block gap-2 mt-1 shrink-0 mb-1">
                <input
                    type="text"
                    placeholder="Buscar por nombre o correo"
                    value={query}
                    onChange={(e) => {
                        setQuery(e.target.value);
                        setPage(1);
                    }}
                    className="h-11 w-60 ms:w-[50%] rounded-xl bg-gray-100 text-gray-500 px-4 text-md outline-none
                    focus:border-[#21b8a6] focus:ring-4 focus:ring-[#21b8a6]/20 focus:text-gray-800"
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
                        className={`${
                            check ? "bg-blue-500 hover:bg-blue-400 w-28 md:w-24" : "bg-red-500 hover:bg-red-400 w-33 md:w-24"
                        } h-11 rounded-xl cursor-pointer flex text-md font-semibold text-white p-[10px] overflow-hidden
                        focus:border-[#21b8a6] focus:ring-4 focus:ring-[#21b8a6]/20 outline-none`}
                        onClick={() => {
                            const next = !check;
                            setCheck(next);
                            void toggleActive(!next);
                            setPage(1);
                        }}
                    >
                        {!check ? (
                            <>
                                <span className="hidden md:block">Listar</span>
                                <span className="md:hidden">Desactivos</span>
                                <UserRoundX className="ml-1 pb-1" size={30} />
                            </>
                        ) : (
                            <>
                                <span className="hidden md:block">Listar</span>
                                <span className="md:hidden">Activos</span>
                                <UserRoundCheck className="ml-1 mr-0 pb-1" size={30} />
                            </>
                        )}
                    </button>

                    <button
                        type="button"
                        className="h-11 w-28 md:w-23 rounded-xl bg-[#107168b7] hover:bg-[#067d71f8]
                        cursor-pointer flex text-md font-semibold text-white overflow-hidden p-[10px]
                        focus:border-[#21b8a6] focus:ring-4 focus:ring-[#21b8a6]/20 outline-none"
                        onClick={() => setOpenModal(true)}
                    >
                        <span className="hidden md:block">Crear </span>
                        <span className="md:hidden">Crear</span>
                        <UserRoundPlus size={30} className="ml-2 pb-1" />
                    </button>
                </div>
            </div>

            <div className="ml-10 shrink-0">
                {error ? <p className="text-sm text-red-600">{error}</p> : null}
                {loading ? <p className="text-sm text-gray-500">Cargando...</p> : null}
            </div>
        </div>
    );
}
