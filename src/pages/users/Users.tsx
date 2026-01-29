import { FormControl, InputLabel, Select, MenuItem, TextField, FormControlLabel, Checkbox} from "@mui/material";
import "./users.css";
import { useState } from "react";
import {  ArrowBigRightDash, ArrowBigLeftDash, RotateCcwSquare, Eraser } from "lucide-react";
import { usePagination } from "@/hooks/usePagination";
import { useFilter } from "@/hooks/useFilter";
import { useUsers, type UserRow } from "../../hooks/useUser";

export default function Userse() {
    const [role, setRole] = useState("");
    const { users, loading, error, showUsersActive, toggleActive, removeUser, restore } = useUsers();
    const { query, setQuery, filteredData } = useFilter(users, ["user_name", "user_email"]);
    const roleFiltered = role ? filteredData.filter((u: UserRow) => u.roleId === role || u.rol === role) : filteredData;
    const { paginatedData, page, totalPages, setPage } = usePagination(roleFiltered, 8);

    const handleChange = (event: any) => {
        setRole(event.target.value);
        setPage(1);
    };

    return (
        <div className="p-5">
            <FormControl size="small" sx={{ ml: 1 }}>
                <div className="grid grid-cols-[2fr_1fr_1fr] gap-2 items-center">
                    <TextField
                        label="Buscar por nombre o correo"
                        size="small"
                        value={query}
                        onChange={(e) => {
                            setQuery(e.target.value);
                            setPage(1);
                        }}
                        sx={{ m: 1, width: "100%" }}
                    />

                    <FormControl size="small" sx={{ ml: 1, width: "100%" }}>
                        <InputLabel id="role-label">Roles</InputLabel>
                        <Select labelId="role-label" value={role} label="Roles" onChange={handleChange}>
                            <MenuItem value="">
                                <em>Seleccione un rol</em>
                            </MenuItem>
                            <MenuItem value="admin">Administrador</MenuItem>
                            <MenuItem value="moderator">Moderador</MenuItem>
                            <MenuItem value="adviser">Asesor</MenuItem>
                        </Select>
                    </FormControl>

                    <FormControlLabel
                        sx={{ justifySelf: "start", m: 0 }}
                        label={showUsersActive ? "Actives" : "Desactives"}
                        control={
                            <Checkbox
                                checked={showUsersActive}
                                onChange={(e) => {
                                    void toggleActive(e.target.checked);
                                    setPage(1);
                                }}
                            />
                        }
                    />
                </div>
            </FormControl>
            {error ? <p style={{ color: "red" }}>{error}</p> : null}
            <table className="content-table">
                <thead>
                    <tr>
                        <th>Nombre</th>
                        <th>Email</th>
                        <th>Role</th>
                        <th>Opciones</th>
                    </tr>
                </thead>
                <tbody>
                    {paginatedData.length === 0 && (
                        <tr>
                            <td>
                                <p>No hay usuarios</p>
                            </td>
                        </tr>
                    )}
                    {paginatedData.map((user) => (
                        <tr key={user.user_id}>
                            <td>{user.user_name}</td>
                            <td>{user.user_email}</td>
                            <td>{user.rol}</td>
                            <td>
                                <div className="flex justify-center mt-0">
                                    <div className="flex items-center gap-2">
                                        {showUsersActive ? (
                                            <button className="expand-btn-trash" onClick={() => void removeUser(user.user_id)}>
                                                <Eraser size={20} />
                                            </button>
                                        ) : (
                                            <button className="expand-btn--restore" onClick={() => void restore(user.user_id)}>
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
            <div className="flex justify-center mr-9" style={{ marginTop: 12 }}>
                <div>
                    <button className="expand-btn" disabled={page === 1} onClick={() => setPage(page - 1)}>
                        <ArrowBigLeftDash />
                    </button>
                    <span>
                        {" "}
                        Página {page} de {totalPages}{" "}
                    </span>
                    <button className="expand-btn" disabled={page === totalPages || totalPages === 0} onClick={() => setPage(page + 1)}>
                        <ArrowBigRightDash />
                    </button>
                </div>
            </div>
        </div>
    );
}
