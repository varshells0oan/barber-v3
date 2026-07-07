import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { BlockedDatesPicker } from "@/components/BlockedDatesPicker";

export const Route = createFileRoute("/_authenticated/$slug/admin/configuracoes")({
  component: Config,
});

const DAYS = [
  { key: "0", label: "Domingo" },
  { key: "1", label: "Segunda" },
  { key: "2", label: "Terça" },
  { key: "3", label: "Quarta" },
  { key: "4", label: "Quinta" },
  { key: "5", label: "Sexta" },
  { key: "6", label: "Sábado" },
];

type Hours = Record<string, { start: string; end: string } | null>;

function Config() {
  const { slug } = Route.useParams();
  const [s, setS] = useState<any>(null);
  const [hours, setHours] = useState<Hours>({});
  const [gallery, setGallery] = useState<string>("");
  const [blockedDates, setBlockedDates] = useState<string[]>([]);

  useEffect(() => {
    supabase
      .from("shop_settings")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle()
      .then(({ data }) => {
        setS(data ?? {});
        setHours((data?.work_hours as Hours) ?? {});
        setGallery(((data?.gallery as string[]) ?? []).join("\n"));
        setBlockedDates((((data as any)?.blocked_dates as string[]) ?? []).slice().sort());
      });
  }, []);

  const setDay = (k: string, patch: Partial<{ start: string; end: string }> | null) => {
    if (patch === null) {
      setHours({ ...hours, [k]: null });
      return;
    }
    const cur = hours[k] ?? { start: "09:00", end: "18:00" };
    setHours({ ...hours, [k]: { ...cur, ...patch } });
  };

  const save = async () => {
    if (!s) return;
    const cleanHours: Hours = {};
    for (const d of DAYS) {
      const v = hours[d.key];
      if (v && v.start && v.end) cleanHours[d.key] = v;
    }
    const payload = {
      name: s.name,
      description: s.description,
      phone: s.phone,
      whatsapp: s.whatsapp,
      instagram: s.instagram,
      address: s.address,
      logo_url: s.logo_url,
      banner_url: s.banner_url,
      work_hours: cleanHours,
      gallery: gallery
        .split(/\n+/)
        .map((x) => x.trim())
        .filter(Boolean),
      blocked_dates: blockedDates.map((x) => x.trim()).filter(Boolean),
      slot_buffer_min: Number(s.slot_buffer_min) || 0,
      loyalty_target: Number(s.loyalty_target) || 10,
      loyalty_reward: s.loyalty_reward,
    };
    let q;
    if (s.id) {
      q = supabase.from("shop_settings").update(payload).eq("id", s.id);
    } else {
      const { getDefaultBarbershopId } = await import("@/lib/current-barbershop");
      q = supabase.from("shop_settings").insert({ ...payload, barbershop_id: await getDefaultBarbershopId(slug) });
    }
    const { error } = await q;
    if (error) return toast.error(error.message);
    toast.success("Configurações salvas");
  };

  if (!s) return <div>Carregando...</div>;

  return (
    <div>
      <h1 className="text-2xl font-semibold">Configurações da barbearia</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Tudo aqui aparece automaticamente na página pública.
      </p>

      <Section title="Identidade">
        <Row label="Nome da loja">
          <Input value={s.name ?? ""} onChange={(v) => setS({ ...s, name: v })} />
        </Row>
        <Row label="Descrição curta">
          <textarea
            value={s.description ?? ""}
            onChange={(e) => setS({ ...s, description: e.target.value })}
            rows={2}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          />
        </Row>
        <div className="grid gap-4 sm:grid-cols-2">
          <Row label="URL do logo">
            <Input value={s.logo_url ?? ""} onChange={(v) => setS({ ...s, logo_url: v })} />
          </Row>
          <Row label="URL do banner (topo)">
            <Input value={s.banner_url ?? ""} onChange={(v) => setS({ ...s, banner_url: v })} />
          </Row>
        </div>
      </Section>

      <Section title="Contato e redes">
        <div className="grid gap-4 sm:grid-cols-2">
          <Row label="Telefone">
            <Input value={s.phone ?? ""} onChange={(v) => setS({ ...s, phone: v })} />
          </Row>
          <Row label="WhatsApp (com DDI, ex: 5511999999999)">
            <Input value={s.whatsapp ?? ""} onChange={(v) => setS({ ...s, whatsapp: v })} />
          </Row>
        </div>
        <Row label="Instagram (só @usuario, sem link)">
          <Input value={s.instagram ?? ""} onChange={(v) => setS({ ...s, instagram: v })} />
        </Row>
        <Row label="Endereço completo">
          <Input value={s.address ?? ""} onChange={(v) => setS({ ...s, address: v })} />
        </Row>
      </Section>

      <Section title="Horário de funcionamento">
        <div className="grid gap-2">
          {DAYS.map((d) => {
            const v = hours[d.key];
            const closed = !v;
            return (
              <div
                key={d.key}
                className="flex flex-wrap items-center gap-3 rounded-md border border-border bg-background/60 p-2"
              >
                <span className="w-24 text-sm font-medium">{d.label}</span>
                <label className="flex items-center gap-1 text-xs text-muted-foreground">
                  <input
                    type="checkbox"
                    checked={!closed}
                    onChange={(e) =>
                      setDay(d.key, e.target.checked ? { start: "09:00", end: "18:00" } : null)
                    }
                  />
                  Aberto
                </label>
                <input
                  type="time"
                  disabled={closed}
                  value={v?.start ?? ""}
                  onChange={(e) => setDay(d.key, { start: e.target.value })}
                  className="rounded-md border border-input bg-background px-2 py-1 text-sm disabled:opacity-50"
                />
                <span className="text-xs text-muted-foreground">até</span>
                <input
                  type="time"
                  disabled={closed}
                  value={v?.end ?? ""}
                  onChange={(e) => setDay(d.key, { end: e.target.value })}
                  className="rounded-md border border-input bg-background px-2 py-1 text-sm disabled:opacity-50"
                />
                {closed && (
                  <span className="text-xs text-muted-foreground">Fechado neste dia</span>
                )}
              </div>
            );
          })}
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          Dias fechados desabilitam o calendário do cliente automaticamente.
        </p>
      </Section>

      <Section title="Folgas e feriados">
        <BlockedDatesPicker value={blockedDates} onChange={setBlockedDates} />
        <p className="text-xs text-muted-foreground">
          Selecione dias no calendário ou toque nos feriados sugeridos. Nenhum barbeiro terá horário disponível nas datas marcadas.
        </p>
      </Section>

      <Section title="Intervalo entre atendimentos">
        <Row label="Minutos de intervalo após cada atendimento (padrão 0)">
          <Input
            type="number"
            value={s.slot_buffer_min ?? 0}
            onChange={(v) => setS({ ...s, slot_buffer_min: v })}
          />
        </Row>
      </Section>

      <Section title="Galeria (uma URL por linha)">
        <textarea
          value={gallery}
          onChange={(e) => setGallery(e.target.value)}
          rows={5}
          placeholder="https://... "
          className="w-full rounded-md border border-input bg-background px-3 py-2 font-mono text-xs"
        />
      </Section>

      <Section title="Fidelidade">
        <div className="grid gap-4 sm:grid-cols-2">
          <Row label="Meta (atendimentos)">
            <Input
              type="number"
              value={s.loyalty_target ?? 10}
              onChange={(v) => setS({ ...s, loyalty_target: v })}
            />
          </Row>
          <Row label="Recompensa">
            <Input
              value={s.loyalty_reward ?? ""}
              onChange={(v) => setS({ ...s, loyalty_reward: v })}
            />
          </Row>
        </div>
      </Section>

      <div className="mt-6 flex justify-end">
        <button
          onClick={save}
          className="rounded-md bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          Salvar alterações
        </button>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mt-6 rounded-xl border border-border bg-card p-5">
      <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
        {title}
      </h2>
      <div className="grid gap-4">{children}</div>
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

function Input({
  value,
  onChange,
  type = "text",
}: {
  value: any;
  onChange: (v: string) => void;
  type?: string;
}) {
  return (
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
    />
  );
}
