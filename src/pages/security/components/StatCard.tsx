import { LucideIcon } from "lucide-react";
import { motion } from "framer-motion";

interface StatCardProps {
  label: string;
  value: string | number;
  subtitle: string;
  icon: LucideIcon;
  variant?: "default" | "primary" | "warning" | "destructive";
}

const variantStyles = {
  default: "bg-card border-border",
  primary: "bg-accent border-primary/20",
  warning: "bg-warning/5 border-warning/20",
  destructive: "bg-destructive/5 border-destructive/20",
};

const iconVariantStyles = {
  default: "text-muted-foreground",
  primary: "text-primary",
  warning: "text-warning",
  destructive: "text-destructive",
};

export const StatCard = ({ label, value, subtitle, icon: Icon, variant = "default" }: StatCardProps) => (
  <motion.div
    initial={{ opacity: 0, y: 8 }}
    animate={{ opacity: 1, y: 0 }}
    className={`rounded-lg border px-4 py-3 ${variantStyles[variant]}`}
  >
    <div className="flex items-center justify-between mb-1">
      <span className="text-xs uppercase tracking-wider text-muted-foreground font-medium">{label}</span>
      <Icon className={`h-3.5 w-3.5 ${iconVariantStyles[variant]}`} />
    </div>
    <p className="text-xl font-semibold tracking-tight text-foreground font-mono-tight">{value}</p>
    <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>
  </motion.div>
);