import { useEffect, useMemo, useState } from "react";
import { getUbigeoCatalog, type UbigeoCatalog } from "@/shared/services/ubigeoCatalogService";

type NamesById = {
  departmentsById: Record<string, string>;
  provincesById: Record<string, string>;
  districtsById: Record<string, string>;
};

export function useUbigeoCatalog(enabled: boolean) {
  const [catalog, setCatalog] = useState<UbigeoCatalog | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!enabled) return;

    let cancelled = false;
    setLoading(true);

    void (async () => {
      try {
        const data = await getUbigeoCatalog();
        if (!cancelled) setCatalog(data);
      } catch {
        if (!cancelled) setCatalog({ departments: [], provinces: [], districts: [] });
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [enabled]);

  const namesById = useMemo<NamesById>(() => {
    const departmentsById: Record<string, string> = {};
    const provincesById: Record<string, string> = {};
    const districtsById: Record<string, string> = {};

    for (const dep of catalog?.departments ?? []) departmentsById[dep.id] = dep.name;
    for (const prov of catalog?.provinces ?? []) provincesById[prov.id] = prov.name;
    for (const dist of catalog?.districts ?? []) districtsById[dist.id] = dist.name;

    return { departmentsById, provincesById, districtsById };
  }, [catalog]);

  return { catalog, loading, namesById };
}

