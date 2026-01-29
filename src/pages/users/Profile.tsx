import ProfileForm from "@/components/users/profile-form-settings";

import "./profile.css";

function Profile() {
    return (
        <div className="flex px-2 h-full w-full items-start justify-start bg-slate-50 p-6">
            <div className="px-10 mb-10 mt-10 text-center">
                <ProfileForm />
            </div>
        </div>
    );
}
export default Profile;
