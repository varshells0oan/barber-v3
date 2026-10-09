import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Repeat, UserCheck } from "lucide-react";
import { todayISO, formatDateBR } from "@/lib/format";

const input = "w-full rounded-md border border-input bg-background px-3 py-2.5 text-sm";

export const addMin = (t: string, m: number) => {
  const [h, mm] = t.split(":").map(Number);
  const tot = h * 60 + mm + m;
  return `${String(Math.floor(tot / 60) % 24).padStart(2, "0")}:${String(tot % 60).padStart(2, "0")}`;
};

type Known = { id: string; name: string; visits: number; loyalty_points: number; last_visit: string | null; last?: { barber_id: string | null; service_id: string | null; service_name: string; barber_name: string; date: string } | null };

export function QuickBookingForm({ barbershopId, initialDate, initialTime, initialBarberId, onSaved }: {
  barbershopId: string; initialDate?: string; initialTime?: string; initialBarberId?: string; onSaved?: () => void;
}) {
  const [barbers, setBarbers] = useState<any[]>([]);
  const [services, setServices] = useState<any[]>([]);
  const [f, setF] = useState({ name: "", phone: "", barberId: initialBarberId ?? "", serviceId: "", date: initialDate ?? todayISO(), time: initialTime ?? "" });
  const [known, setKnown] = useState<Known | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    Promise.all([
      supabase.from("barbers").select("id,name").eq("barbershop_id", barbershopId).eq("active", true).order("name"),
      supabase.from("services").select("id,name,price,duration").eq("barbershop_id", barbershopId).eq("active", true).order("name"),
    ]).then(([b, s]) => { setBarbers(b.data ?? []); setServices(s.data ?? []); });
  }, [barbershopId]);

  const digits = f.phone.replace(/\D/g, "");
  useEffect(() => {
    if (digits.length < 10) { setKnown(null); return; }
    let cancel = false;
    (async () => {
      const { data: c } = await supabase.from("clients").select("id,name,visits,loyalty_points,last_visit")
        .eq("barbershop_id", barbershopId).eq("phone", digits).maybeSingle();
      if (cancel) return;
      if (!c) { setKnown(null); return; }
      const { data: last } = await supabase.from("appointments").select("barber_id,service_id,service_name,barber_name,date")
        .eq("barbershop_id", barbershopId).eq("client_phone", digits).neq("status", "cancelado")
        .order("date", { ascending: false }).order("time", { ascending: false }).limit(1).maybeSingle();
      if (cancel) return;
      setKnown({ ...(c as any), last });
      setF((p) => (p.name ? p : { ...p, name: c.name }));
    })();
    return () => { cancel = true; };
  }, [digits, barbershopId]);

  const repeatLast = () => {
    if (!known?.last) return;
    setF((p) => ({ ...p, name: known.name, serviceId: known.last?.service_id ?? p.serviceId, barberId: known.last?.barber_id ?? p.barberId, time: "" }));
    toast.info("Escolha a nova data e horário");
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const svc = services.find((s) => s.id === f.serviceId);
    const brb = barbers.find((b) => b.id === f.barberId);
    const name = f.name.trim().slice(0, 100);
    if (name.length < 2 || digits.length < 10 || digits.length > 13 || !svc || !brb || !/^\d{2}:\d{2}$/.test(f.time)) return toast.error("Preencha todos os campos");
    setSaving(true);
    let clientId = known?.id ?? null;
    if (!clientId) {
      const { data: ex } = await supabase.from("clients").select("id").eq("barbershop_id", barbershopId).eq("phone", digits).maybeSingle();
      clientId = ex?.id ?? (await supabase.from("clients").insert({ barbershop_id: barbershopId, name, phone: digits } as any).select("id").single()).data?.id ?? null;
    }
    const { error } = await supabase.from("appointments").insert({
      barbershop_id: barbershopId, client_id: clientId, client_name: name, client_phone: digits,
      barber_id: brb.id, barber_name: brb.name, service_id: svc.id, service_name: svc.name,
      date: f.date, time: f.time, end_time: addMin(f.time, svc.duration), duration: svc.duration, price: svc.price, status: "confirmado",
    } as any);
    setSaving(false);
    if (error) return toast.error(/overlap|conflit|SLOT|ocupado/i.test(error.message) ? "Horário já ocupado" : "Não foi possível agendar");
    toast.success("Agendamento criado");
    setF({ ...f, name: "", phone: "", time: "" });
    setKnown(null);
    onSaved?.();
  };

  return (
    <form onSubmit={submit} className="grid grid-cols-1 gap-2 sm:grid-cols-2">
      <input className={input} placeholder="Telefone" inputMode="tel" maxLength={20} value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} />
      <input className={input} placeholder="Nome do cliente" maxLength={100} value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} />
      {known && (
        <div className="rounded-lg border border-primary/40 bg-primary/5 p-3 text-xs sm:col-span-2">
          <div className="flex items-center gap-2 text-sm font-medium"><UserCheck className="h-4 w-4 text-primary" />Cliente já cadastrado: {known.name}</div>
          <div className="mt-1 grid grid-cols-2 gap-x-3 gap-y-0.5 text-muted-foreground">
            <span>Visitas: {known.visits}</span>
            <span>Pontos: {known.loyalty_points}</span>
            <span>Última visita: {known.last_visit ? formatDateBR(known.last_visit) : known.last ? formatDateBR(known.last.date) : "—"}</span>
            <span>Último serviço: {known.last?.service_name ?? "—"}</span>
            <span className="col-span-2">Último profissional: {known.last?.barber_name ?? "—"}</span>
          </div>
          {known.last && (
            <button type="button" onClick={repeatLast} className="mt-2 inline-flex items-center gap-1.5 rounded-md border border-border bg-background px-3 py-2 text-xs font-medium">
              <Repeat className="h-3.5 w-3.5" />Repetir último atendimento
            </button>
          )}
        </div>
      )}
      <select className={input} value={f.serviceId} onChange={(e) => setF({ ...f, serviceId: e.target.value })}>
        <option value="">Serviço</option>{services.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
      </select>
      <select className={input} value={f.barberId} onChange={(e) => setF({ ...f, barberId: e.target.value })}>
        <option value="">Profissional</option>{barbers.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
      </select>
      <input type="date" className={input} value={f.date} onChange={(e) => setF({ ...f, date: e.target.value })} />
      <input type="time" className={input} value={f.time} onChange={(e) => setF({ ...f, time: e.target.value })} />
      <button disabled={saving} className="rounded-md bg-primary py-3 text-sm font-medium text-primary-foreground disabled:opacity-60 sm:col-span-2">
        {saving ? "Salvando…" : "Agendar"}
      </button>
    </form>
  );
}
