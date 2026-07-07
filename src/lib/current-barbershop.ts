import { supabase } from "@/integrations/supabase/client";

const cache = new Map<string, string>();

/**
 * Retorna o id de uma barbearia a partir do slug (URL).
 * Se slug não for passado, cai no fallback "principal" (compat retro).
 */
export async function getDefaultBarbershopId(slug?: string): Promise<string> {
  const key = slug ?? "principal";
  const cached = cache.get(key);
  if (cached) return cached;
  const { data, error } = await supabase
    .from("barbershops")
    .select("id")
    .eq("slug", key)
    .maybeSingle();
  if (error || !data) throw new Error(`Barbearia "${key}" não encontrada`);
  cache.set(key, data.id);
  return data.id;
}
