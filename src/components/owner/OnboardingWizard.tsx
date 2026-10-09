import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Check } from "lucide-react";
import { ImageUpload } from "@/components/ImageUpload";

const input = "w-full rounded-md border border-input bg-background px-3 py-2.5 text-sm";
const DAYS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

export function OnboardingWizard({ barbershopId, shopName, onDone }: { barbershopId: string; shopName: string; onDone: () => void }) {
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [shop, setShop] = useState({ name: shopName ?? "", logo: "", phone: "" });
  const [svc, setSvc] = useState({ name: "", price: "", duration: "30" });
  const [days, setDays] = useState<string[]>(["1", "2", "3", "4", "5", "6"]);
  const [hours, setHours] = useState({ start: "09:00", end: "19:00" });

  const saveShop = async () => {
    const name = shop.name.trim().slice(0, 100);
    const phone = shop.phone.replace(/\D/g, "");
    if (name.length < 2 || phone.length < 10) return toast.error("Informe nome e telefone/WhatsApp");
        setSaving(true);
    const a = await supabase.from("barbershops").update({ name, phone, whatsapp: phone, ...(shop.logo ? { logo_url: shop.logo } : {}) } as any).eq("id", barbershopId);
    const b = await supabase.from("shop_settings").update({ name, phone, whatsapp: phone, ...(shop.logo ? { logo_url: shop.logo } : {}) } as any).eq("barbershop_id", barbershopId);
    setSaving(false);
    if (a.error || b.error) return toast.error("Não foi possível salvar");
    setStep(1);
  };

  const saveService = async () => {
    const price = Number(svc.price.replace(",", "."));
    const duration = Number(svc.duration);
    if (svc.name.trim().length < 2 || !(price >= 0) || !(duration >= 5 && duration <= 480)) return toast.error("Preencha nome, preço e duração");
    setSaving(true);
    const { error } = await supabase.from("services").insert({ barbershop_id: barbershopId, name: svc.name.trim().slice(0, 80), price, duration, category: "Geral", active: true } as any);
    setSaving(false);
    if (error) return toast.error("Não foi possível salvar o serviço");
    setStep(2);
  };

  const saveHours = async () => {
    if (!days.length || hours.start >= hours.end) return toast.error("Escolha os dias e um horário válido");
    const wh: Record<string, { start: string; end: string } | null> = {};
    for (let i = 0; i < 7; i++) wh[String(i)] = days.includes(String(i)) ? { ...hours } : null;
    setSaving(true);
    const a = await supabase.from("shop_settings").update({ work_hours: wh } as any).eq("barbershop_id", barbershopId);
    const b = await supabase.from("barbershops").update({ onboarding_completed: true } as any).eq("id", barbershopId);
    setSaving(false);
    if (a.error || b.error) return toast.error("Não foi possível salvar");
    setStep(3);
  };

  const titles = ["Sua barbearia", "Seus serviços", "Seus horários"];
  return (
    <section className="rounded-xl border border-primary/50 bg-card p-4">
      {step < 3 && (
        <>
          <div className="mb-3 flex gap-1.5">{titles.map((_, i) => <div key={i} className={`h-1.5 flex-1 rounded-full ${i <= step ? "bg-primary" : "bg-muted"}`} />)}</div>
          <p className="text-xs text-muted-foreground">Passo {step + 1} de 3</p>
          <h2 className="font-heading text-lg font-semibold">{titles[step]}</h2>
        </>
      )}
      {step === 0 && (
        <div className="mt-3 grid gap-2">
          <input className={input} placeholder="Nome da barbearia" value={shop.name} onChange={(e) => setShop({ ...shop, name: e.target.value })} />
          <ImageUpload barbershopId={barbershopId} value={shop.logo || null} onChange={(u) => setShop({ ...shop, logo: u ?? "" })} />
          <input className={input} placeholder="Telefone / WhatsApp" inputMode="tel" value={shop.phone} onChange={(e) => setShop({ ...shop, phone: e.target.value })} />
          <button disabled={saving} onClick={saveShop} className="rounded-md bg-primary py-3 text-sm font-medium text-primary-foreground disabled:opacity-60">Continuar</button>
        </div>
      )}
      {step === 1 && (
        <div className="mt-3 grid gap-2">
          <input className={input} placeholder="Nome do serviço (ex: Corte)" value={svc.name} onChange={(e) => setSvc({ ...svc, name: e.target.value })} />
          <div className="grid grid-cols-2 gap-2">
            <input className={input} placeholder="Preço (R$)" inputMode="decimal" value={svc.price} onChange={(e) => setSvc({ ...svc, price: e.target.value })} />
            <input className={input} placeholder="Duração (min)" inputMode="numeric" value={svc.duration} onChange={(e) => setSvc({ ...svc, duration: e.target.value })} />
          </div>
          <button disabled={saving} onClick={saveService} className="rounded-md bg-primary py-3 text-sm font-medium text-primary-foreground disabled:opacity-60">Continuar</button>
        </div>
      )}
      {step === 2 && (
        <div className="mt-3 grid gap-3">
          <div className="flex flex-wrap gap-1.5">
            {DAYS.map((d, i) => {
              const k = String(i); const on = days.includes(k);
              return <button key={k} type="button" onClick={() => setDays(on ? days.filter((x) => x !== k) : [...days, k])}
                className={`min-w-11 rounded-md border px-3 py-2 text-sm ${on ? "border-primary bg-primary text-primary-foreground" : "border-border"}`}>{d}</button>;
            })}
          </div>
          <div className="grid grid-cols-2 gap-2">
            <label className="text-xs text-muted-foreground">Abertura<input type="time" className={input} value={hours.start} onChange={(e) => setHours({ ...hours, start: e.target.value })} /></label>
            <label className="text-xs text-muted-foreground">Fechamento<input type="time" className={input} value={hours.end} onChange={(e) => setHours({ ...hours, end: e.target.value })} /></label>
          </div>
          <button disabled={saving} onClick={saveHours} className="rounded-md bg-primary py-3 text-sm font-medium text-primary-foreground disabled:opacity-60">Concluir</button>
        </div>
      )}
      {step === 3 && (
        <div className="py-4 text-center">
          <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-primary text-primary-foreground"><Check className="h-6 w-6" /></div>
          <h2 className="mt-3 font-heading text-xl font-semibold">Seu site está pronto.</h2>
          <p className="mt-1 text-sm text-muted-foreground">Compartilhe o link abaixo com seus clientes.</p>
          <button onClick={onDone} className="mt-4 rounded-md border border-border px-4 py-2.5 text-sm">Fechar</button>
        </div>
      )}
    </section>
  );
}
