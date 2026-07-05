import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { PublicHeader } from "@/components/PublicHeader";
import { brl, cleanPhone, timeToMin, minToTime, todayISO } from "@/lib/format";
import { Calendar } from "@/components/ui/calendar";
import { Check, ChevronLeft, Clock, Star, CalendarDays, Sun, Sunset } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
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
  const [shop, setShop] = useState<any>(null);
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
      const [s, b, sh] = await Promise.all([
        supabase.from("services").select("*").eq("active", true).order("price"),
        supabase.from("barbers").select("*").eq("active", true),
        supabase.from("shop_settings").select("*").order("created_at", { ascending: false }).limit(1).maybeSingle(),
      ]);
      setServices(s.data ?? []);
      setBarbers(b.data ?? []);
      setShop(sh.data);
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
  const loadSlots = async () => {
    if (!selectedDate || !selectedBarber || !selectedService) return;
    const { data: appts } = await supabase
      .from("appointments")
      .select("time,end_time,status")
      .eq("barber_id", selectedBarber.id)
      .eq("date", selectedDate);
    const active = (appts ?? []).filter((a) => a.status !== "cancelado");
    const dow = String(new Date(selectedDate + "T00:00:00").getDay());
    const bh = (selectedBarber.work_hours ?? {})[dow] ?? DEFAULT_HOURS[dow];
    const sh = (shop?.work_hours ?? {})[dow];
    let hours = bh;
    if (sh && bh) {
      const start = Math.max(timeToMin(bh.start), timeToMin(sh.start));
      const end = Math.min(timeToMin(bh.end), timeToMin(sh.end));
      hours = end > start ? { start: minToTime(start), end: minToTime(end) } : null;
    } else if (shop?.work_hours && !sh) {
      hours = null;
    }
    if (!hours) {
      setSlots([]);
      return;
    }
    const start = timeToMin(hours.start);
    const end = timeToMin(hours.end);
    const dur = selectedService.duration;
    const buffer = Number(shop?.slot_buffer_min) || 0;
    const shopBlocked: string[] = (shop?.blocked_dates as string[]) ?? [];
    const barberBlocked: string[] = selectedBarber.blocked_dates ?? [];
    if (shopBlocked.includes(selectedDate) || barberBlocked.includes(selectedDate)) {
      setSlots([]);
      return;
    }
    const generated: string[] = [];
    for (let m = start; m + dur <= end; m += 30) {
      const slotStart = m;
      const slotEnd = m + dur + buffer;
      const conflict = active.some((a) => {
        const aStart = timeToMin(a.time);
        const aEnd = timeToMin(a.end_time) + buffer;
        return slotStart < aEnd && slotEnd > aStart;
      });
      if (!conflict) generated.push(minToTime(slotStart));
    }
    if (selectedDate === todayISO()) {
      const nowMin = new Date().getHours() * 60 + new Date().getMinutes();
      setSlots(generated.filter((t) => timeToMin(t) > nowMin));
    } else {
      setSlots(generated);
    }
  };

  useEffect(() => {
    loadSlots();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDate, selectedBarber, selectedService, shop]);

  const workHours = selectedBarber?.work_hours ?? DEFAULT_HOURS;
  const shopHours = shop?.work_hours ?? null;
  const shopBlocked: string[] = (shop?.blocked_dates as string[]) ?? [];
  const blockedDates: string[] = selectedBarber?.blocked_dates ?? [];
  const isDayDisabled = (d: Date) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (d < today) return true;
    const iso = format(d, "yyyy-MM-dd");
    if (blockedDates.includes(iso)) return true;
    if (shopBlocked.includes(iso)) return true;
    const dow = String(d.getDay());
    if (!workHours[dow]) return true;
    if (shopHours && !shopHours[dow]) return true;
    return false;
  };

  const groupedSlots = {
    manha: slots.filter((t) => timeToMin(t) < 12 * 60),
    tarde: slots.filter((t) => timeToMin(t) >= 12 * 60 && timeToMin(t) < 18 * 60),
    noite: slots.filter((t) => timeToMin(t) >= 18 * 60),
  };

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
      const msg = String(e?.message ?? "");
      if (msg.includes("SLOT_TAKEN") || e?.code === "23505") {
        toast.error("Esse horário acabou de ser reservado. Escolha outro.");
        setSelectedTime("");
        await loadSlots();
        setStep(2);
      } else {
        toast.error(msg || "Erro ao agendar");
      }
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
            <p className="mt-1 text-sm text-muted-foreground">
              Escolha um dia e um horário disponível com {selectedBarber?.name}.
            </p>

            <div className="mt-6 grid gap-6 lg:grid-cols-[auto_1fr]">
              <div className="rounded-2xl border border-border bg-card p-3">
                <Calendar
                  mode="single"
                  locale={ptBR}
                  selected={selectedDate ? new Date(selectedDate + "T00:00:00") : undefined}
                  onSelect={(d) => {
                    if (!d) return;
                    setSelectedDate(format(d, "yyyy-MM-dd"));
                    setSelectedTime("");
                  }}
                  disabled={isDayDisabled}
                  showOutsideDays
                  className="pointer-events-auto"
                />
                <div className="mt-3 flex items-center gap-3 border-t border-border px-2 pt-3 text-xs text-muted-foreground">
                  <span className="inline-flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-primary" /> Selecionado
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-muted-foreground/40" /> Indisponível
                  </span>
                </div>
              </div>

              <div className="min-w-0">
                {!selectedDate ? (
                  <div className="grid h-full min-h-40 place-items-center rounded-2xl border border-dashed border-border bg-card/40 p-6 text-center">
                    <div>
                      <CalendarDays className="mx-auto h-8 w-8 text-muted-foreground/60" />
                      <p className="mt-2 text-sm text-muted-foreground">
                        Selecione uma data no calendário
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="rounded-2xl border border-border bg-card p-5">
                    <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                      <CalendarDays className="h-4 w-4 text-primary" />
                      {format(new Date(selectedDate + "T00:00:00"), "EEEE, dd 'de' MMMM", { locale: ptBR })}
                    </div>

                    {slots.length === 0 ? (
                      <p className="mt-5 text-sm text-muted-foreground">
                        Nenhum horário disponível nesta data.
                      </p>
                    ) : (
                      <div className="mt-5 space-y-5">
                        {([
                          { key: "manha", label: "Manhã", icon: Sun, items: groupedSlots.manha },
                          { key: "tarde", label: "Tarde", icon: Sun, items: groupedSlots.tarde },
                          { key: "noite", label: "Noite", icon: Sunset, items: groupedSlots.noite },
                        ] as const).map((g) =>
                          g.items.length === 0 ? null : (
                            <div key={g.key}>
                              <div className="mb-2 flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                                <g.icon className="h-3.5 w-3.5" /> {g.label}
                              </div>
                              <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                                {g.items.map((t) => (
                                  <button
                                    key={t}
                                    onClick={() => setSelectedTime(t)}
                                    className={`rounded-lg border py-2.5 text-sm font-medium transition ${
                                      selectedTime === t
                                        ? "border-primary bg-primary text-primary-foreground shadow-lg shadow-primary/20"
                                        : "border-border bg-background hover:border-primary hover:text-primary"
                                    }`}
                                  >
                                    {t}
                                  </button>
                                ))}
                              </div>
                            </div>
                          ),
                        )}
                      </div>
                    )}

                    {selectedTime && (
                      <button
                        onClick={() => setStep(3)}
                        className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-primary py-3 font-medium text-primary-foreground shadow-lg shadow-primary/20 transition hover:brightness-110"
                      >
                        Continuar <Check className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>

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
