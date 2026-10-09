import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Copy, Share2, ExternalLink, Check, Zap, Repeat } from "lucide-react";
import { todayISO } from "@/lib/format";

const card = "rounded-xl border border-border bg-card p-4";
const input = "w-full rounded-md border border-input bg-background px-3 py-2 text-sm";

export function OwnerTools({ slug, barbershopId }: { slug: string; barbershopId: string }) {
  const [shop, setShop] = useState<any>(null);
  const [vis, setVis] = useState<Record<string, boolean>>({});
  const [counts, setCounts] = useState({ services: 0, barbers: 0 });

  const load = async () => {
    const [b, s, sv, br] = await Promise.all([
      supabase.from("barbershops").select("id,name,accepting_bookings,allow_reschedule,onboarding_completed,phone,address").eq("id", barbershopId).maybeSingle(),
      supabase.from("shop_settings").select("public_visibility").eq("barbershop_id", barbershopId).maybeSingle(),
      supabase.from("services").select("id", { count: "exact", head: true }).eq("barbershop_id", barbershopId),
      supabase.from("barbers").select("id", { count: "exact", head: true }).eq("barbershop_id", barbershopId),
    ]);
    setShop(b.data);
    setVis(((s.data as any)?.public_visibility ?? {}) as Record<string, boolean>);
    setCounts({ services: sv.count ?? 0, barbers: br.count ?? 0 });
  };
  useEffect(() => { load(); }, [barbershopId]);

  const updateShop = async (patch: Record<string, any>) => {
    const { error } = await supabase.from("barbershops").update(patch as any).eq("id", barbershopId);
    if (error) return toast.error("Não foi possível salvar");
    setShop({ ...shop, ...patch });
  };
  const toggleVis = async (k: string) => {
    const next = { ...vis, [k]: vis[k] === false };
    const { error } = await supabase.from("shop_settings").update({ public_visibility: next } as any).eq("barbershop_id", barbershopId);
    if (error) return toast.error("Não foi possível salvar");
    setVis(next);
  };

  if (!shop) return null;
  return (
    <div className="grid gap-4">
      {!shop.onboarding_completed && (
        <Onboarding slug={slug} shop={shop} counts={counts} onDone={() => updateShop({ onboarding_completed: true })} />
      )}
      <div className="grid gap-4 lg:grid-cols-2">
        <QuickBooking barbershopId={barbershopId} />
        <ShareCard slug={slug} name={shop.name} />
      </div>
      <section className={card}>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">Página pública</h2>
        <div className="grid gap-2 sm:grid-cols-2">
          <Toggle label="Aceitar agendamentos online" on={shop.accepting_bookings} onClick={() => updateShop({ accepting_bookings: !shop.accepting_bookings })} />
          <Toggle label="Cliente pode reagendar" on={shop.allow_reschedule} onClick={() => updateShop({ allow_reschedule: !shop.allow_reschedule })} />
          <Toggle label="Mostrar descrição" on={vis.descricao !== false} onClick={() => toggleVis("descricao")} />
          <Toggle label="Mostrar Instagram" on={vis.instagram !== false} onClick={() => toggleVis("instagram")} />
          <Toggle label="Mostrar WhatsApp/telefone" on={vis.whatsapp !== false} onClick={() => toggleVis("whatsapp")} />
          <Toggle label="Mostrar endereço/mapa" on={vis.endereco !== false} onClick={() => toggleVis("endereco")} />
          <Toggle label="Mostrar horários" on={vis.horarios !== false} onClick={() => toggleVis("horarios")} />
          <Toggle label="Mostrar equipe" on={vis.equipe !== false} onClick={() => toggleVis("equipe")} />
          <Toggle label="Mostrar galeria" on={vis.galeria !== false} onClick={() => toggleVis("galeria")} />
          <Toggle label="Mostrar depoimentos" on={vis.depoimentos !== false} onClick={() => toggleVis("depoimentos")} />
        </div>
      </section>
    </div>
  );
}

function Toggle({ label, on, onClick }: { label: string; on: boolean; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="flex items-center justify-between rounded-lg border border-border px-3 py-2.5 text-left text-sm">
      <span>{label}</span>
      <span className={`relative h-5 w-9 rounded-full transition ${on ? "bg-primary" : "bg-muted"}`}>
        <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-background transition ${on ? "left-4" : "left-0.5"}`} />
      </span>
    </button>
  );
}

function Onboarding({ slug, shop, counts, onDone }: { slug: string; shop: any; counts: { services: number; barbers: number }; onDone: () => void }) {
  const steps = [
    { label: "Dados da barbearia (telefone e endereço)", ok: !!shop.phone && !!shop.address, to: `/barbeiro/${slug}/configuracoes` },
    { label: "Cadastre pelo menos um serviço", ok: counts.services > 0, to: `/barbeiro/${slug}/servicos` },
    { label: "Cadastre pelo menos um barbeiro", ok: counts.barbers > 0, to: `/barbeiro/${slug}/equipe` },
  ];
  const all = steps.every((s) => s.ok);
  return (
    <section className="rounded-xl border border-primary/50 bg-card p-4">
      <h2 className="font-heading text-lg font-semibold">Primeiros passos</h2>
      <p className="text-sm text-muted-foreground">Complete os 3 passos para começar a receber agendamentos.</p>
      <ol className="mt-3 grid gap-2">
        {steps.map((s, i) => (
          <li key={i} className="flex items-center gap-3 rounded-lg border border-border p-3 text-sm">
            <span className={`grid h-6 w-6 place-items-center rounded-full text-xs ${s.ok ? "bg-primary text-primary-foreground" : "border border-border"}`}>
              {s.ok ? <Check className="h-3.5 w-3.5" /> : i + 1}
            </span>
            <span className="flex-1">{s.label}</span>
            {!s.ok && <a href={s.to} className="text-primary underline">Fazer agora</a>}
          </li>
        ))}
      </ol>
      <button onClick={onDone} disabled={!all} className="mt-3 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50">
        {all ? "Concluir configuração" : "Conclua os passos acima"}
      </button>
    </section>
  );
}

function ShareCard({ slug, name }: { slug: string; name: string }) {
  const url = typeof window !== "undefined" ? `${window.location.origin}/cliente/${slug}` : `/cliente/${slug}`;
  const qr = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&margin=8&data=${encodeURIComponent(url)}`;
  const copy = async () => { await navigator.clipboard.writeText(url); toast.success("Link copiado"); };
  const share = async () => {
    if (navigator.share) { try { await navigator.share({ title: name, text: `Agende seu horário na ${name}`, url }); } catch {} }
    else window.open(`https://wa.me/?text=${encodeURIComponent(`Agende seu horário na ${name}: ${url}`)}`, "_blank");
  };
  return (
    <section className={card}>
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">Divulgue sua barbearia</h2>
      <div className="flex flex-wrap items-center gap-4">
        <img src={qr} alt="QR Code do link de agendamento" width={140} height={140} className="rounded-lg bg-foreground p-1" />
        <div className="grid min-w-0 flex-1 gap-2">
          <code className="truncate rounded bg-muted px-2 py-1 text-xs">{url}</code>
          <div className="flex flex-wrap gap-2">
            <button onClick={copy} className="inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-2 text-sm"><Copy className="h-4 w-4" />Copiar</button>
            <button onClick={share} className="inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-2 text-sm"><Share2 className="h-4 w-4" />Compartilhar</button>
            <a href={`/cliente/${slug}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-2 text-sm"><ExternalLink className="h-4 w-4" />Pré-visualizar</a>
            <a href={qr.replace("220x220", "800x800")} target="_blank" rel="noreferrer" className="rounded-md border border-border px-3 py-2 text-sm">Baixar QR</a>
          </div>
        </div>
      </div>
    </section>
  );
}

const addMin = (t: string, m: number) => {
  const [h, mm] = t.split(":").map(Number);
  const tot = h * 60 + mm + m;
  return `${String(Math.floor(tot / 60) % 24).padStart(2, "0")}:${String(tot % 60).padStart(2, "0")}`;
};

function QuickBooking({ barbershopId }: { barbershopId: string }) {
  const [barbers, setBarbers] = useState<any[]>([]);
  const [services, setServices] = useState<any[]>([]);
  const [frequent, setFrequent] = useState<any[]>([]);
  const [f, setF] = useState({ name: "", phone: "", barberId: "", serviceId: "", date: todayISO(), time: "" });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    Promise.all([
      supabase.from("barbers").select("id,name").eq("barbershop_id", barbershopId).eq("active", true).order("name"),
      supabase.from("services").select("id,name,price,duration").eq("barbershop_id", barbershopId).eq("active", true).order("name"),
      supabase.from("clients").select("id,name,phone,visits").eq("barbershop_id", barbershopId).order("visits", { ascending: false }).limit(6),
    ]).then(([b, s, c]) => { setBarbers(b.data ?? []); setServices(s.data ?? []); setFrequent(c.data ?? []); });
  }, [barbershopId]);

  const repeatLast = async (c: any) => {
    const { data } = await supabase.from("appointments").select("barber_id,service_id").eq("barbershop_id", barbershopId)
      .eq("client_phone", c.phone).order("date", { ascending: false }).order("time", { ascending: false }).limit(1).maybeSingle();
    setF((p) => ({ ...p, name: c.name, phone: c.phone, barberId: data?.barber_id ?? p.barberId, serviceId: data?.service_id ?? p.serviceId }));
    if (!data) toast.info("Sem atendimento anterior — escolha serviço e barbeiro");
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const phone = f.phone.replace(/\D/g, "");
    const svc = services.find((s) => s.id === f.serviceId);
    const brb = barbers.find((b) => b.id === f.barberId);
    if (f.name.trim().length < 2 || phone.length < 10 || !svc || !brb || !/^\d{2}:\d{2}$/.test(f.time)) return toast.error("Preencha todos os campos");
    setSaving(true);
    let { data: cl } = await supabase.from("clients").select("id").eq("barbershop_id", barbershopId).eq("phone", phone).maybeSingle();
    if (!cl) cl = (await supabase.from("clients").insert({ barbershop_id: barbershopId, name: f.name.trim(), phone } as any).select("id").single()).data;
    const { error } = await supabase.from("appointments").insert({
      barbershop_id: barbershopId, client_id: cl?.id ?? null, client_name: f.name.trim(), client_phone: phone,
      barber_id: brb.id, barber_name: brb.name, service_id: svc.id, service_name: svc.name,
      date: f.date, time: f.time, end_time: addMin(f.time, svc.duration), duration: svc.duration, price: svc.price, status: "confirmado",
    } as any);
    setSaving(false);
    if (error) return toast.error(/overlap|conflit|SLOT/i.test(error.message) ? "Horário já ocupado" : "Não foi possível agendar");
    toast.success("Agendamento criado");
    setF({ ...f, name: "", phone: "", time: "" });
  };

  return (
    <section className={card}>
      <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-muted-foreground"><Zap className="h-4 w-4" />Agendamento rápido</h2>
      {frequent.length > 0 && (
        <div className="mb-3 flex flex-wrap gap-1.5">
          {frequent.map((c) => (
            <button key={c.id} type="button" onClick={() => repeatLast(c)} title="Repetir último atendimento"
              className="inline-flex items-center gap-1 rounded-full border border-border px-2.5 py-1 text-xs hover:border-primary">
              <Repeat className="h-3 w-3" />{c.name}
            </button>
          ))}
        </div>
      )}
      <form onSubmit={submit} className="grid grid-cols-2 gap-2">
        <input className={input} placeholder="Nome do cliente" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} />
        <input className={input} placeholder="Telefone" inputMode="tel" value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} />
        <select className={input} value={f.serviceId} onChange={(e) => setF({ ...f, serviceId: e.target.value })}>
          <option value="">Serviço</option>{services.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
        <select className={input} value={f.barberId} onChange={(e) => setF({ ...f, barberId: e.target.value })}>
          <option value="">Barbeiro</option>{barbers.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
        </select>
        <input type="date" className={input} value={f.date} onChange={(e) => setF({ ...f, date: e.target.value })} />
        <input type="time" className={input} value={f.time} onChange={(e) => setF({ ...f, time: e.target.value })} />
        <button disabled={saving} className="col-span-2 rounded-md bg-primary py-2.5 text-sm font-medium text-primary-foreground disabled:opacity-60">
          {saving ? "Salvando…" : "Agendar"}
        </button>
      </form>
    </section>
  );
}
