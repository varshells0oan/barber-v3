import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Copy, Share2, ExternalLink, Zap } from "lucide-react";
import { QuickBookingForm } from "./QuickBookingForm";
import { OnboardingWizard } from "./OnboardingWizard";

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
        <OnboardingWizard barbershopId={barbershopId} shopName={shop.name} onDone={() => setShop({ ...shop, onboarding_completed: true })} />
      )}
      <div className="grid gap-4 lg:grid-cols-2">
        <section className={card}><h2 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-muted-foreground"><Zap className="h-4 w-4" />Agendamento rápido</h2><QuickBookingForm barbershopId={barbershopId} /></section>
        <ShareCard slug={slug} name={shop.name} />
      </div>
      <section className={card}>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">Página pública</h2>
        <div className="grid gap-2 sm:grid-cols-2">
          <Toggle label="Aceitar agendamentos online" on={shop.accepting_bookings} onClick={() => updateShop({ accepting_bookings: !shop.accepting_bookings })} />
          <Toggle label="Cliente pode reagendar" on={shop.allow_reschedule} onClick={() => updateShop({ allow_reschedule: !shop.allow_reschedule })} />
          <Toggle label="Mostrar descrição" on={vis.descricao !== false} onClick={() => toggleVis("descricao")} />
          <Toggle label="Mostrar Instagram" on={vis.instagram !== false} onClick={() => toggleVis("instagram")} />
          <Toggle label="Mostrar WhatsApp" on={vis.whatsapp !== false} onClick={() => toggleVis("whatsapp")} />
          <Toggle label="Mostrar telefone" on={vis.telefone !== false} onClick={() => toggleVis("telefone")} />
          <Toggle label="Mostrar e-mail" on={vis.email !== false} onClick={() => toggleVis("email")} />
          <Toggle label="Mostrar preços" on={vis.precos !== false} onClick={() => toggleVis("precos")} />
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

