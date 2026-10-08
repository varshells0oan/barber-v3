import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

/** Descobre a barbearia do dono logado e leva para o painel correspondente. */
export function DonoRedirect({ rest }: { rest?: string }) {
  const [msg, setMsg] = useState("Abrindo seu painel…");
  useEffect(() => {
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return void (location.href = "/auth");
      const { data: role } = await supabase.from("user_roles").select("barbershop_id").eq("user_id", u.user.id).eq("role", "admin").not("barbershop_id", "is", null).limit(1).maybeSingle();
      if (!role?.barbershop_id) {
        const { data: sup } = await supabase.rpc("is_superadmin", { _user_id: u.user.id });
        if (sup) return void location.replace("/superadmin");
        return setMsg("Nenhuma barbearia vinculada à sua conta.");
      }
      const { data: shop } = await supabase.from("barbershops").select("slug").eq("id", role.barbershop_id).maybeSingle();
      if (!shop) return setMsg("Barbearia não encontrada.");
      const sub = (rest ?? "").replace(/[^a-z0-9/-]/gi, "") || "admin";
      location.replace(`/barbeiro/${shop.slug}/${sub}`);
    })();
  }, [rest]);
  return <div className="dark grid min-h-screen place-items-center bg-background text-sm text-muted-foreground">{msg}</div>;
}
