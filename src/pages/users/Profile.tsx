import ProfileForm from "@/components/users/profile-form-settings";

import "./profile.css";

function Profile() {
    return (
        <div className="flex justify-start px-2">
            <div className="px-20 mb-10 mt-5 text-center">
                <ProfileForm />
            </div>
        </div>
    );
}
export default Profile;
