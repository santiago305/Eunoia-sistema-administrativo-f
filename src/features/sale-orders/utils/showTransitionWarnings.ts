import { toast } from "@/shared/hooks/use-toast";

export function showTransitionWarnings(warnings?: string[]) {
  if (!warnings?.length) return;
  toast({
    title: "Acción omitida",
    description: warnings.join(". "),
  });
}
