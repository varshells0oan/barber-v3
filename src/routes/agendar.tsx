import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { PublicHeader } from "@/components/PublicHeader";
import { brl, cleanPhone, timeToMin, minToTime, todayISO } from "@/lib/format";
import { Check, ChevronLeft, Clock, Star } from "lucide-react";
import { toast } from "sonner";

const searchSchema = z.object({
  service: z.string().optional(),
});

export const Route = createFileRoute("/agendar")({
  validateSearch: (s) => searchSchema.parse(s),
  component: Booking,
});

const DEFAULT_HOURS: Record<string, { start: string; end: string }> = {
  "1": { start: "09:00", end: "19:00" },
  "2": { start: "09:00", end: "19:00" },
  "3": { start: "09:00", end: "19:00" },
  "4": { start: "09:00", end: "19:00" },
  "5": { start: "09:00", end: "19:00" },
  "6": { start: "09:00", end: "17:00" },
};

function Booking() {
  const { service: initialServiceId } = Route.useSearch();
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [services, setServices] = useState<any[]>([]);
  const [barbers, setBarbers] = useState<any[]>([]);
  const [selectedService, setSelectedService] = useState<any>(null);
  const [selectedBarber, setSelectedBarber] = useState<any>(null);
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedTime, setSelectedTime] = useState("");
  const [slots, setSlots] = useState<string[]>([]);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    (async () => {
      const [s, b] = await Promise.all([
        supabase.from("services").select("*").eq("active", true).order("price"),
        supabase.from("barbers").select("*").eq("active", true),
      ]);
      setServices(s.data ?? []);
      setBarbers(b.data ?? []);
      if (initialServiceId && s.data) {
        const found = s.data.find((x: any) => x.id === initialServiceId);
        if (found) {
          setSelectedService(found);
          setStep(1);
        }
      }
    })();
  }, [initialServiceId]);

  // Load available slots when date changes
  useEffect(() => {
    if (!selectedDate || !selectedBarber || !selectedService) return;
    (async () => {
      const { data: appts } = await supabase
        .from("appointments")
        .select("time,end_time,status")
        .eq("barber_id", selectedBarber.id)
        .eq("date", selectedDate);
      const active = (appts ?? []).filter((a) => a.status !== "cancelado");
      const dow = String(new Date(selectedDate + "T00:00:00").getDay());
      const hours = (selectedBarber.work_hours ?? {})[dow] ?? DEFAULT_HOURS[dow];
      if (!hours) {
        setSlots([]);
        return;
      }
      const start = timeToMin(hours.start);
      const end = timeToMin(hours.end);
      const dur = selectedService.duration;
      const blocked: string[] = selectedBarber.blocked_dates ?? [];
      if (blocked.includes(selectedDate)) {
        setSlots([]);
        return;
      }
      const generated: string[] = [];
      for (let m = start; m + dur <= end; m += 30) {
        const slotStart = m;
        const slotEnd = m + dur;
        const conflict = active.some((a) => {
          const aStart = timeToMin(a.time);
          const aEnd = timeToMin(a.end_time);
          return slotStart < aEnd && slotEnd > aStart;
        });
        if (!conflict) generated.push(minToTime(slotStart));
      }
      // Filter out past times if today
      if (selectedDate === todayISO()) {
        const nowMin = new Date().getHours() * 60 + new Date().getMinutes();
        setSlots(generated.filter((t) => timeToMin(t) > nowMin));
      } else {
        setSlots(generated);
      }
    })();
  }, [selectedDate, selectedBarber, selectedService]);

  const monthDays = useMemo(() => {
    const days: { iso: string; label: number; dow: number; disabled: boolean }[] = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    for (let i = 0; i < 21; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() + i);
      const iso = d.toISOString().slice(0, 10);
      const dow = d.getDay();
      const hours = (selectedBarber?.work_hours ?? DEFAULT_HOURS)[String(dow)];
      days.push({ iso, label: d.getDate(), dow, disabled: !hours });
    }
    return days;
  }, [selectedBarber]);

  const handleSubmit = async () => {
    if (!name.trim() || !phone.trim()) {
      toast.error("Preencha nome e WhatsApp");
      return;
    }
    setSubmitting(true);
    const cp = cleanPhone(phone);
    try {
      // Find or create client
      const { data: existing } = await supabase
        .from("clients")
        .select("id")
        .eq("phone", cp)
        .maybeSingle();
      let clientId = existing?.id;
      if (!clientId) {
        const { data: created, error } = await supabase
          .from("clients")
          .insert({ name, phone: cp })
          .select("id")
          .single();
        if (error) throw error;
        clientId = created.id;
      }
      const endTime = minToTime(timeToMin(selectedTime) + selectedService.duration);
      const { error: apptErr } = await supabase.from("appointments").insert({
        client_id: clientId,
        client_name: name,
        client_phone: cp,
        barber_id: selectedBarber.id,
        barber_name: selectedBarber.name,
        service_id: selectedService.id,
        service_name: selectedService.name,
        date: selectedDate,
        time: selectedTime,
        end_time: endTime,
        duration: selectedService.duration,
        price: selectedService.price,
        status: "pendente",
        notes: notes || null,
      });
      if (apptErr) throw apptErr;
      navigate({ to: "/agendamento-confirmado" });
    } catch (e: any) {
      toast.error(e.message ?? "Erro ao agendar");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="dark min-h-screen bg-background text-foreground">
      <PublicHeader />
      <div className="mx-auto max-w-3xl px-4 py-8">
        <div className="mb-6 flex items-center gap-2 text-sm text-muted-foreground">
          {step > 0 && (
            <button
              onClick={() => setStep(step - 1)}
              className="inline-flex items-center gap-1 hover:text-foreground"
            >
              <ChevronLeft className="h-4 w-4" /> Voltar
            </button>
          )}
          <div className="ml-auto flex gap-1">
            {[0, 1, 2, 3].map((n) => (
              <div
                key={n}
                className={`h-1.5 w-8 rounded-full ${
                  n <= step ? "bg-primary" : "bg-border"
                }`}
              />
            ))}
          </div>
        </div>

        {step === 0 && (
          <>
            <h1 className="text-2xl font-semibold text-foreground">Escolha o serviço</h1>
            <div className="mt-6 grid gap-3">
              {services.map((s) => (
                <button
                  key={s.id}
                  onClick={() => {
                    setSelectedService(s);
                    setStep(1);
                  }}
                  className="flex items-center justify-between rounded-xl border border-border bg-card p-4 text-left transition hover:border-primary"
                >
                  <div>
                    <div className="font-medium text-foreground">{s.name}</div>
                    <div className="text-sm text-muted-foreground">{s.description}</div>
                    <div className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                      <Clock className="h-3 w-3" /> {s.duration} min
                    </div>
                  </div>
                  <div className="font-semibold text-primary">{brl(s.price)}</div>
                </button>
              ))}
            </div>
          </>
        )}

        {step === 1 && (
          <>
            <h1 className="text-2xl font-semibold text-foreground">Escolha o barbeiro</h1>
            <div className="mt-6 grid gap-3">
              {barbers.map((b) => (
                <button
                  key={b.id}
                  onClick={() => {
                    setSelectedBarber(b);
                    setStep(2);
                  }}
                  className="flex items-center gap-4 rounded-xl border border-border bg-card p-4 text-left transition hover:border-primary"
                >
                  {b.photo_url ? (
                    <img
                      src={b.photo_url}
                      alt={b.name}
                      className="h-14 w-14 rounded-full object-cover"
                    />
                  ) : (
                    <div className="grid h-14 w-14 place-items-center rounded-full bg-primary/10 text-primary font-semibold">
                      {b.name[0]}
                    </div>
                  )}
                  <div className="flex-1">
                    <div className="font-medium text-foreground">{b.name}</div>
                    <div className="text-sm text-muted-foreground">{b.specialty}</div>
                    <div className="mt-1 flex items-center gap-1 text-xs text-amber-600">
                      <Star className="h-3 w-3 fill-current" /> {b.rating ?? 5.0}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </>
        )}

        {step === 2 && (
          <>
            <h1 className="text-2xl font-semibold text-foreground">Data e horário</h1>
            <div className="mt-6">
              <div className="text-sm font-medium text-foreground">Escolha uma data</div>
              <div className="mt-3 grid grid-cols-7 gap-2">
                {monthDays.map((d) => (
                  <button
                    key={d.iso}
                    disabled={d.disabled}
                    onClick={() => {
                      setSelectedDate(d.iso);
                      setSelectedTime("");
                    }}
                    className={`rounded-lg border p-2 text-sm ${
                      d.disabled
                        ? "border-border bg-muted text-muted-foreground/50"
                        : selectedDate === d.iso
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-border bg-card hover:border-primary"
                    }`}
                  >
                    <div className="text-[10px] uppercase">
                      {["dom", "seg", "ter", "qua", "qui", "sex", "sáb"][d.dow]}
                    </div>
                    <div className="text-base font-semibold">{d.label}</div>
                  </button>
                ))}
              </div>
            </div>
            {selectedDate && (
              <div className="mt-8">
                <div className="text-sm font-medium text-foreground">Horários disponíveis</div>
                {slots.length === 0 ? (
                  <p className="mt-3 text-sm text-muted-foreground">
                    Nenhum horário disponível nesta data.
                  </p>
                ) : (
                  <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-4">
                    {slots.map((t) => (
                      <button
                        key={t}
                        onClick={() => setSelectedTime(t)}
                        className={`rounded-md border p-2 text-sm ${
                          selectedTime === t
                            ? "border-primary bg-primary text-primary-foreground"
                            : "border-border bg-card hover:border-primary"
                        }`}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
            {selectedTime && (
              <button
                onClick={() => setStep(3)}
                className="mt-8 w-full rounded-md bg-primary py-3 font-medium text-primary-foreground hover:bg-primary/90"
              >
                Continuar
              </button>
            )}
          </>
        )}

        {step === 3 && (
          <>
            <h1 className="text-2xl font-semibold text-foreground">Confirmar agendamento</h1>
            <div className="mt-6 rounded-xl border border-border bg-card p-5">
              <div className="grid gap-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Serviço</span>
                  <span className="font-medium">{selectedService?.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Valor</span>
                  <span className="font-medium">{brl(selectedService?.price)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Barbeiro</span>
                  <span className="font-medium">{selectedBarber?.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Data</span>
                  <span className="font-medium">{selectedDate}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Horário</span>
                  <span className="font-medium">{selectedTime}</span>
                </div>
              </div>
            </div>

            <div className="mt-6 grid gap-3">
              <label className="text-sm font-medium text-foreground">
                Seu nome
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  placeholder="Nome completo"
                />
              </label>
              <label className="text-sm font-medium text-foreground">
                WhatsApp
                <input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  placeholder="(11) 99999-9999"
                />
              </label>
              <label className="text-sm font-medium text-foreground">
                Observações (opcional)
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  rows={3}
                />
              </label>
              <button
                disabled={submitting}
                onClick={handleSubmit}
                className="mt-2 inline-flex items-center justify-center gap-2 rounded-md bg-primary py-3 font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
              >
                {submitting ? "Enviando..." : <>Confirmar agendamento <Check className="h-4 w-4" /></>}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
