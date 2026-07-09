import { useEffect, useState } from "react";
import { getDefaultBarbershopId } from "@/lib/current-barbershop";

export function useBarbershopId(slug?: string) {
  const [id, setId] = useState<string | null>(null);
  useEffect(() => {
    if (!slug) return;
    let mounted = true;
    getDefaultBarbershopId(slug)
      .then((v) => mounted && setId(v))
      .catch(() => mounted && setId(null));
    return () => {
      mounted = false;
    };
  }, [slug]);
  return id;
}
