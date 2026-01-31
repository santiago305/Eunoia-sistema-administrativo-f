import ProfileForm from "@/components/users/profile-form-settings";
import ChangePassword from "@/pages/settings/ChangePassword";

// import "./profile.css";

function Profile() {
    return (
        <div className="page-shell flex items-start justify-center">
            <div className="w-full max-w-6xl grid gap-6 lg:grid-cols-[3fr_2fr]">
                <div className="page-card">
                    <div className="page-card-header">
                        <h2 className="page-card-title">Perfil</h2>
                        <p className="page-card-subtitle">Actualiza tu información personal y tu foto.</p>
                    </div>
                    <div className="px-6 py-5">
                        {/* <ProfileForm /> */}
                    </div>
                </div>
                <ChangePassword embedded />
            </div>
        </div>
    );
}
export default Profile;
