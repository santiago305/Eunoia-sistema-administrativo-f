import UserMenu from "./UserMenu";
import type { User } from "./types";

interface SidebarFooterProps {
  user: User;
  onLogout: () => void;
}

const SidebarFooter = ({ user, onLogout }: SidebarFooterProps) => {
  return (
    <div className="p-3 select-none">
      <UserMenu user={user} onLogout={onLogout} />
    </div>
  );
};

export default SidebarFooter;
