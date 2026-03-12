import { 
  Home, 
  Settings, 
  Users, 
  ChevronDown, 
  ChevronRight,
  LogOut,
  User,
  Lock,
  Monitor,
  PanelLeftClose,
  PanelLeft,
  Package,
  Warehouse,
  Pickaxe,
  Store,
  Factory,
  Banknote
} from "lucide-react";

export const IconHome = ({ className }: { className?: string }) => (
  <Home className={className} size={20} />
);

export const IconSettings = ({ className }: { className?: string }) => (
  <Settings className={className} size={20} />
);

export const IconWarehouse = ({ className }: { className?: string }) => (
  <Warehouse className={className} size={20} />
);
export const IconPaymentMethod = ({ className }: { className?: string }) => (
  <Banknote className={className} size={20} />
);
export const IconCompany = ({ className }: { className?: string }) => (
  <Factory className={className} size={20} />
);
export const IconPurchase = ({ className }: { className?: string }) => (
  <Store className={className} size={20} />
);
export const IconRowMaterial = ({ className }: { className?: string }) => (
  <Pickaxe className={className} size={20} />
);

export const IconUsers = ({ className }: { className?: string }) => (
  <Users className={className} size={20} />
);

export const IconStock = ({ className }: { className?: string }) => (
  <Package className={className} size={20} />
);

export const IconChevronDown = ({ className }: { className?: string }) => (
  <ChevronDown className={className} size={16} />
);

export const IconChevronRight = ({ className }: { className?: string }) => (
  <ChevronRight className={className} size={16} />
);

export const IconLogout = ({ className }: { className?: string }) => (
  <LogOut className={className} size={18} />
);

export const IconUser = ({ className }: { className?: string }) => (
  <User className={className} size={18} />
);

export const IconLock = ({ className }: { className?: string }) => (
  <Lock className={className} size={18} />
);

export const IconMonitor = ({ className }: { className?: string }) => (
  <Monitor className={className} size={18} />
);

export const IconCollapse = ({ className }: { className?: string }) => (
  <PanelLeftClose className={className} size={18} />
);

export const IconExpand = ({ className }: { className?: string }) => (
  <PanelLeft className={className} size={18} />
);


