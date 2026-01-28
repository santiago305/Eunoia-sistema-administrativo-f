import ProfileForm from "../../components/profile-form-settings";
import { RoutesPaths } from "@/router/config/routesPaths";

import "./setting.css";

function Settings() {
    return (
        <div className="grid grid-cols-12 gap-8 px-2">
            <div className="col-span-4 px-1 mb-10 mt-5 text-center">
                <ProfileForm />
            </div>
            <div className="col-span-8 px-1 mb-10 mt-5 text-center">
                <table className="content-table-settings">
                    <thead>
                        <tr>
                            <th>Opciones Avanzadas</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td>Sessiones</td>
                        </tr>
                        <tr>
                            <td>Historial de actividad</td>
                        </tr>
                        <tr>
                            <td>Cambiar contraseña</td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>
    );
}
export default Settings;
