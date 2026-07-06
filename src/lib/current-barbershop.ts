import { supabase } from "@/integrations/supabase/client";

let cached: string | null = null;

/**
 * Retorna o id da barbearia default ("principal").
 * Helper temporário até que a Fase 3 traga o contexto de barbearia por URL.
 */
export async function getDefaultBarbershopId(): Promise<string> {
  if (cached) return cached;
  const { data, error } = await supabase
    .from("barbershops")
    .select("id")
    .eq("slug", "principal")
    .maybeSingle();
  if (error || !data) throw new Error("Barbearia principal não encontrada");
  cached = data.id;
  return cached;
}
