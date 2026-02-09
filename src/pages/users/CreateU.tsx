import { PageTitle } from "@/components/PageTitle";
import { UserForm } from "./components/users/formUser";

export default function CreateUserPage() {
    return (
        <div className="h-screen w-screen bg-white text-black overflow-hidden">
            <PageTitle title="Creación de usuario" />
            <div className="relative px-5 md:px-10 py-4 border-b border-black/10">
                <h1 className="text-3xl font-semibold text-gray-700">Creación de usuario</h1>
            </div>

            <UserForm />
        </div>
    );
}

