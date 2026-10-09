import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { X } from "lucide-react";
import { todayISO, timeToMin, minToTime } from "@/lib/format";
import { QuickBookingForm } from "./QuickBookingForm";

const input = "rounded-md border border-input bg-background px-3 py-2.5 text-sm";

export function DaySlots({ barbershopId, onSaved }: { barbershopId: string; onSaved?: () => void }) {
  const [date, setDate] = useState(todayISO());
  const [barbers, setBarbers] = useState<any[]>([]);
  const [barberId, setBarberId] = useState("");
  const [appts, setAppts] = useState<any[]>([]);
  const [open, setOpen] = useState<string | null>(null);

  useEffect(() => {
    supabase.from("barbers").select("id,name").eq("barbershop_id", barbershopId).eq("active", true).order("name")
      .then(({ data }) => { setBarbers(data ?? []); if (data?.[0]) setBarberId((p) => p || data[0].id); });
  }, [barbershopId]);

  const load = () => {
    if (!barberId) return;
    supabase.from("appointments").select("time,end_time,client_name,status").eq("barbershop_id", barbershopId)
      .eq("barber_id", barberId).eq("date", date).neq("status", "cancelado")
      .then(({ data }) => setAppts(data ?? []));
  };
  useEffect(load, [barbershopId, barberId, date]);

  const slots: string[] = [];
  for (let m = 8 * 60; m < 21 * 60; m += 30) slots.push(minToTime(m));
  const busy = (t: string) => {
    const m = timeToMin(t);
    return appts.find((a) => m >= timeToMin(a.time) && m < timeToMin(a.end_time));
  };

  return (
    <section className="mt-4 rounded-xl border border-border bg-card p-4">
      <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Horários do dia</h2>
      <p className="text-xs text-muted-foreground">Toque em um horário livre para agendar.</p>
      <div className="mt-3 flex flex-wrap gap-2">
        <input type="date" className={input} value={date} onChange={(e) => setDate(e.target.value)} />
        <select className={input} value={barberId} onChange={(e) => setBarberId(e.target.value)}>
          {barbers.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
        </select>
      </div>
      {barbers.length === 0 ? (
        <p className="mt-3 text-sm text-muted-foreground">Cadastre um profissional para usar a agenda.</p>
      ) : (
        <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-6">
          {slots.map((t) => {
            const b = busy(t);
            return b ? (
              <div key={t} className="truncate rounded-md bg-muted px-2 py-2.5 text-center text-xs text-muted-foreground" title={b.client_name}>
                <div className="font-mono">{t}</div><div className="truncate">{b.client_name}</div>
              </div>
            ) : (
              <button key={t} onClick={() => setOpen(t)} className="rounded-md border border-dashed border-border px-2 py-2.5 font-mono text-sm hover:border-primary hover:text-primary">
                {t}
              </button>
            );
          })}
        </div>
      )}
      {open && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-background/80 p-0 backdrop-blur-sm sm:items-center sm:p-4" onClick={() => setOpen(null)}>
          <div className="max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-t-2xl border border-border bg-card p-4 sm:rounded-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="mb-3 flex items-center justify-between">
              <h3 className="font-heading text-lg font-semibold">Novo agendamento · {open}</h3>
              <button onClick={() => setOpen(null)} aria-label="Fechar" className="rounded-md p-2 hover:bg-muted"><X className="h-5 w-5" /></button>
            </div>
            <QuickBookingForm key={`${date}-${open}-${barberId}`} barbershopId={barbershopId} initialDate={date} initialTime={open} initialBarberId={barberId}
              onSaved={() => { setOpen(null); load(); onSaved?.(); }} />
          </div>
        </div>
      )}
    </section>
  );
}
