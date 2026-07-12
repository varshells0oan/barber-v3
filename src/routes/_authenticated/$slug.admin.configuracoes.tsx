import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { BlockedDatesPicker } from "@/components/BlockedDatesPicker";
import {
  THEME_PRESETS,
  DEFAULT_PRESET,
  DEFAULT_CUSTOM_COLORS,
  CUSTOM_PRESET_KEY,
  type ThemePresetKey,
} from "@/lib/theme-presets";

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

type Testimonial = { name: string; text: string; rating: number };

function Config() {
  const { slug } = Route.useParams();
  const [s, setS] = useState<any>(null);
  const [hours, setHours] = useState<Hours>({});
  const [gallery, setGallery] = useState<string>("");
  const [galleryUrls, setGalleryUrls] = useState<string>("");
  const [testimonials, setTestimonials] = useState<Testimonial[]>([]);
  const [blockedDates, setBlockedDates] = useState<string[]>([]);

  useEffect(() => {
    (async () => {
      const { getDefaultBarbershopId } = await import("@/lib/current-barbershop");
      const id = await getDefaultBarbershopId(slug);
      const { data } = await supabase
        .from("shop_settings")
        .select("*")
        .eq("barbershop_id", id)
        .maybeSingle();
      setS(data ?? { barbershop_id: id });
      setHours((data?.work_hours as Hours) ?? {});
      setGallery(((data?.gallery as string[]) ?? []).join("\n"));
      setGalleryUrls((((data as any)?.gallery_urls as string[]) ?? []).join("\n"));
      setTestimonials((((data as any)?.testimonials as Testimonial[]) ?? []));
      setBlockedDates((((data as any)?.blocked_dates as string[]) ?? []).slice().sort());
    })();
  }, [slug]);

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
      gallery_urls: galleryUrls
        .split(/\n+/)
        .map((x) => x.trim())
        .filter(Boolean),
      testimonials: testimonials
        .map((t) => ({
          name: (t.name ?? "").trim(),
          text: (t.text ?? "").trim(),
          rating: Math.max(1, Math.min(5, Number(t.rating) || 5)),
        }))
        .filter((t) => t.name && t.text),
      tagline: (s.tagline ?? "").trim() || null,
      blocked_dates: blockedDates.map((x) => x.trim()).filter(Boolean),
      slot_buffer_min: Number(s.slot_buffer_min) || 0,
      loyalty_target: Number(s.loyalty_target) || 10,
      loyalty_reward: s.loyalty_reward,
      theme_preset: (s.theme_preset as string) ?? DEFAULT_PRESET,
      theme_custom:
        s.theme_preset === CUSTOM_PRESET_KEY
          ? (Array.isArray(s.theme_custom) && s.theme_custom.length >= 4
              ? s.theme_custom.slice(0, 4)
              : DEFAULT_CUSTOM_COLORS)
          : (s.theme_custom ?? null),
    };
    const { getDefaultBarbershopId } = await import("@/lib/current-barbershop");
    const bid = s.barbershop_id ?? (await getDefaultBarbershopId(slug));
    const { error } = await supabase
      .from("shop_settings")
      .upsert({ ...payload, barbershop_id: bid }, { onConflict: "barbershop_id" });
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
        <Row label="Tagline (frase curta em destaque no topo da landing)">
          <Input
            value={s.tagline ?? ""}
            onChange={(v) => setS({ ...s, tagline: v })}
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

      <Section title="Tema visual da página pública">
        <p className="-mt-2 text-xs text-muted-foreground">
          Escolha a paleta de cores que seus clientes verão na landing page e no agendamento. O painel administrativo não é afetado.
        </p>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {Object.values(THEME_PRESETS).map((p) => {
            const selected = (s.theme_preset ?? DEFAULT_PRESET) === p.key;
            return (
              <button
                key={p.key}
                type="button"
                onClick={() => setS({ ...s, theme_preset: p.key })}
                className={`group relative overflow-hidden rounded-xl border p-4 text-left transition ${
                  selected
                    ? "border-primary ring-2 ring-primary/40"
                    : "border-border hover:border-primary/60"
                }`}
              >
                <div className="flex items-center gap-1.5">
                  {p.swatches.map((c, i) => (
                    <span
                      key={i}
                      className="h-8 w-8 rounded-full ring-1 ring-black/10"
                      style={{ background: c }}
                    />
                  ))}
                </div>
                <div className="mt-3 text-sm font-semibold">{p.label}</div>
                <div className="mt-0.5 text-xs text-muted-foreground">{p.description}</div>
                {selected && (
                  <span className="absolute right-3 top-3 rounded-full bg-primary px-2 py-0.5 text-[10px] font-medium text-primary-foreground">
                    Selecionado
                  </span>
                )}
              </button>
            );
          })}

          {/* Custom palette card */}
          {(() => {
            const selected = s.theme_preset === CUSTOM_PRESET_KEY;
            const cur: string[] =
              Array.isArray(s.theme_custom) && s.theme_custom.length >= 4
                ? s.theme_custom
                : [...DEFAULT_CUSTOM_COLORS];
            return (
              <div
                onClick={() =>
                  !selected &&
                  setS({
                    ...s,
                    theme_preset: CUSTOM_PRESET_KEY,
                    theme_custom: cur,
                  })
                }
                className={`relative overflow-hidden rounded-xl border p-4 text-left transition ${
                  selected
                    ? "border-primary ring-2 ring-primary/40"
                    : "cursor-pointer border-dashed border-border hover:border-primary/60"
                }`}
              >
                <div className="flex items-center gap-1.5">
                  {cur.map((c, i) => (
                    <span
                      key={i}
                      className="h-8 w-8 rounded-full ring-1 ring-black/10"
                      style={{ background: c }}
                    />
                  ))}
                </div>
                <div className="mt-3 text-sm font-semibold">Personalizada</div>
                <div className="mt-0.5 text-xs text-muted-foreground">
                  Escolha suas próprias cores.
                </div>

                {selected && (
                  <>
                    <span className="absolute right-3 top-3 rounded-full bg-primary px-2 py-0.5 text-[10px] font-medium text-primary-foreground">
                      Selecionado
                    </span>
                    <div className="mt-4 grid grid-cols-2 gap-3">
                      {CUSTOM_SLOTS.map((slot, i) => (
                        <ColorSlot
                          key={slot.key}
                          label={slot.label}
                          hint={slot.hint}
                          value={cur[i] ?? DEFAULT_CUSTOM_COLORS[i]}
                          onChange={(hex) => {
                            const next = [...cur];
                            next[i] = hex;
                            setS({ ...s, theme_custom: next });
                          }}
                        />
                      ))}
                    </div>
                  </>
                )}
              </div>
            );
          })()}
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

      <Section title="Galeria de cortes (uma URL de foto por linha)">
        <p className="-mt-2 text-xs text-muted-foreground">
          Cole aqui os links de fotos dos cortes que você quer mostrar na landing. Uma URL por linha.
        </p>
        <textarea
          value={galleryUrls}
          onChange={(e) => setGalleryUrls(e.target.value)}
          rows={6}
          placeholder="https://..."
          className="w-full rounded-md border border-input bg-background px-3 py-2 font-mono text-xs"
        />
      </Section>

      <Section title="Depoimentos de clientes">
        <p className="-mt-2 text-xs text-muted-foreground">
          Cadastre o que seus clientes dizem sobre a barbearia. Aparecem na landing como cards.
        </p>
        <div className="grid gap-3">
          {testimonials.map((t, i) => (
            <div key={i} className="rounded-lg border border-border bg-background/60 p-3">
              <div className="grid gap-2 sm:grid-cols-[1fr_120px_auto]">
                <input
                  type="text"
                  value={t.name}
                  placeholder="Nome do cliente"
                  onChange={(e) => {
                    const arr = [...testimonials];
                    arr[i] = { ...arr[i], name: e.target.value };
                    setTestimonials(arr);
                  }}
                  className="rounded-md border border-input bg-background px-3 py-2 text-sm"
                />
                <select
                  value={t.rating ?? 5}
                  onChange={(e) => {
                    const arr = [...testimonials];
                    arr[i] = { ...arr[i], rating: Number(e.target.value) };
                    setTestimonials(arr);
                  }}
                  className="rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  {[5, 4, 3, 2, 1].map((n) => (
                    <option key={n} value={n}>
                      {n} estrela{n > 1 ? "s" : ""}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() =>
                    setTestimonials(testimonials.filter((_, idx) => idx !== i))
                  }
                  className="rounded-md border border-border px-3 py-2 text-xs hover:bg-destructive/10 hover:text-destructive"
                >
                  Remover
                </button>
              </div>
              <textarea
                value={t.text}
                placeholder="Depoimento do cliente..."
                onChange={(e) => {
                  const arr = [...testimonials];
                  arr[i] = { ...arr[i], text: e.target.value };
                  setTestimonials(arr);
                }}
                rows={2}
                className="mt-2 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              />
            </div>
          ))}
          <button
            type="button"
            onClick={() =>
              setTestimonials([...testimonials, { name: "", text: "", rating: 5 }])
            }
            className="self-start rounded-md border border-dashed border-border px-4 py-2 text-sm hover:border-primary hover:text-primary"
          >
            + Adicionar depoimento
          </button>
        </div>
      </Section>

      <Section title="Galeria (campo legado — pode ignorar)">
        <p className="-mt-2 text-xs text-muted-foreground">
          Campo antigo mantido por compatibilidade. Use "Galeria de cortes" acima.
        </p>
        <textarea
          value={gallery}
          onChange={(e) => setGallery(e.target.value)}
          rows={3}
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
