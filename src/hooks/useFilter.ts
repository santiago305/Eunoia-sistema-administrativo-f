import { useMemo, useState } from "react";

export function useFilter<T extends Record<string, any>>(
  data: T[],
  fields: (keyof T)[]
) {
  const [query, setQuery] = useState("");

  const filteredData = useMemo(() => {
    if (!query) return data;

    const q = query.toLowerCase();

    return data.filter(item =>
      fields.some(field =>
        String(item[field]).toLowerCase().includes(q)
      )
    );
  }, [data, query, fields]);

  return {
    query,
    setQuery,
    filteredData,
  };
}
