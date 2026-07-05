import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin/configuracoes")({
  component: Config,
});

function Config() {
  const [s, setS] = useState<any>(null);

  useEffect(() => {
    supabase
      .from("shop_settings")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle()
      .then(({ data }) => setS(data));
  }, []);

  const save = async () => {
    if (!s) return;
    const payload = {
      name: s.name,
      description: s.description,
      phone: s.phone,
      whatsapp: s.whatsapp,
      instagram: s.instagram,
      address: s.address,
      banner_url: s.banner_url,
      loyalty_target: Number(s.loyalty_target),
      loyalty_reward: s.loyalty_reward,
    };
    const q = s.id
      ? supabase.from("shop_settings").update(payload).eq("id", s.id)
      : supabase.from("shop_settings").insert(payload);
    const { error } = await q;
    if (error) return toast.error(error.message);
    toast.success("Configurações salvas");
  };

  if (!s) return <div>Carregando...</div>;

  return (
    <div>
      <h1 className="text-2xl font-semibold">Configurações</h1>
      <div className="mt-6 grid gap-4 rounded-xl border border-border bg-card p-5">
        <Row label="Nome">
          <input
            value={s.name ?? ""}
            onChange={(e) => setS({ ...s, name: e.target.value })}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          />
        </Row>
        <Row label="Descrição">
          <textarea
            value={s.description ?? ""}
            onChange={(e) => setS({ ...s, description: e.target.value })}
            rows={2}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          />
        </Row>
        <div className="grid gap-4 sm:grid-cols-2">
          <Row label="Telefone">
            <input
              value={s.phone ?? ""}
              onChange={(e) => setS({ ...s, phone: e.target.value })}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            />
          </Row>
          <Row label="WhatsApp (com DDI)">
            <input
              value={s.whatsapp ?? ""}
              onChange={(e) => setS({ ...s, whatsapp: e.target.value })}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            />
          </Row>
        </div>
        <Row label="Instagram (@)">
          <input
            value={s.instagram ?? ""}
            onChange={(e) => setS({ ...s, instagram: e.target.value })}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          />
        </Row>
        <Row label="Endereço">
          <input
            value={s.address ?? ""}
            onChange={(e) => setS({ ...s, address: e.target.value })}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          />
        </Row>
        <Row label="URL do banner">
          <input
            value={s.banner_url ?? ""}
            onChange={(e) => setS({ ...s, banner_url: e.target.value })}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          />
        </Row>
        <div className="grid gap-4 sm:grid-cols-2">
          <Row label="Meta fidelidade (atendimentos)">
            <input
              type="number"
              value={s.loyalty_target ?? 10}
              onChange={(e) => setS({ ...s, loyalty_target: e.target.value })}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            />
          </Row>
          <Row label="Recompensa">
            <input
              value={s.loyalty_reward ?? ""}
              onChange={(e) => setS({ ...s, loyalty_reward: e.target.value })}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            />
          </Row>
        </div>
        <div className="flex justify-end">
          <button
            onClick={save}
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            Salvar
          </button>
        </div>
      </div>
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block text-sm">
      <span className="mb-1 block font-medium">{label}</span>
      {children}
    </label>
  );
}
