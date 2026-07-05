import { useMemo } from "react";
import { Calendar } from "@/components/ui/calendar";
import { X, CalendarDays } from "lucide-react";

// Gauss algorithm for Easter Sunday
function easterSunday(year: number) {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(year, month - 1, day);
}

const iso = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

const addDays = (d: Date, n: number) => {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
};

function holidaysFor(year: number): { date: string; name: string }[] {
  const easter = easterSunday(year);
  return [
    { date: `${year}-01-01`, name: "Confraternização Universal" },
    { date: iso(addDays(easter, -48)), name: "Carnaval (segunda)" },
    { date: iso(addDays(easter, -47)), name: "Carnaval (terça)" },
    { date: iso(addDays(easter, -2)), name: "Sexta-feira Santa" },
    { date: `${year}-04-21`, name: "Tiradentes" },
    { date: `${year}-05-01`, name: "Dia do Trabalho" },
    { date: iso(addDays(easter, 60)), name: "Corpus Christi" },
    { date: `${year}-09-07`, name: "Independência" },
    { date: `${year}-10-12`, name: "N. Sra. Aparecida" },
    { date: `${year}-11-02`, name: "Finados" },
    { date: `${year}-11-15`, name: "Proclamação da República" },
    { date: `${year}-12-25`, name: "Natal" },
  ];
}

const formatBR = (isoDate: string) => {
  const [y, m, d] = isoDate.split("-");
  return `${d}/${m}/${y}`;
};

export function BlockedDatesPicker({
  value,
  onChange,
}: {
  value: string[];
  onChange: (v: string[]) => void;
}) {
  const now = new Date();
  const holidays = useMemo(
    () => [...holidaysFor(now.getFullYear()), ...holidaysFor(now.getFullYear() + 1)],
    [now.getFullYear()],
  );

  const holidayMap = useMemo(() => {
    const m = new Map<string, string>();
    holidays.forEach((h) => m.set(h.date, h.name));
    return m;
  }, [holidays]);

  const selectedDates = useMemo(
    () =>
      value
        .map((v) => {
          const [y, m, d] = v.split("-").map(Number);
          if (!y || !m || !d) return null;
          return new Date(y, m - 1, d);
        })
        .filter((d): d is Date => !!d),
    [value],
  );

  const toggle = (date: string) => {
    if (value.includes(date)) onChange(value.filter((d) => d !== date));
    else onChange([...value, date].sort());
  };

  const upcomingHolidays = holidays
    .filter((h) => h.date >= iso(now))
    .slice(0, 8);

  return (
    <div className="grid gap-4 md:grid-cols-[auto_1fr]">
      <div className="rounded-lg border border-border bg-background/60 p-2">
        <Calendar
          mode="multiple"
          selected={selectedDates}
          onSelect={(days) => {
            const arr = (days ?? []) as Date[];
            onChange(arr.map(iso).sort());
          }}
          modifiers={{
            holiday: (d) => holidayMap.has(iso(d)),
          }}
          modifiersClassNames={{
            holiday: "text-primary font-semibold",
          }}
          disabled={{ before: new Date(now.getFullYear(), now.getMonth(), 1) }}
        />
      </div>

      <div className="flex flex-col gap-4">
        <div>
          <div className="mb-2 flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
            <CalendarDays className="h-3.5 w-3.5" /> Feriados nacionais
          </div>
          <div className="flex flex-wrap gap-1.5">
            {upcomingHolidays.map((h) => {
              const active = value.includes(h.date);
              return (
                <button
                  key={h.date}
                  type="button"
                  onClick={() => toggle(h.date)}
                  className={`rounded-full border px-2.5 py-1 text-xs transition-colors ${
                    active
                      ? "border-primary bg-primary/15 text-primary"
                      : "border-border bg-background/60 text-muted-foreground hover:border-primary/50 hover:text-foreground"
                  }`}
                  title={formatBR(h.date)}
                >
                  {h.name} · {h.date.slice(8, 10)}/{h.date.slice(5, 7)}
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <div className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Dias bloqueados ({value.length})
          </div>
          {value.length === 0 ? (
            <p className="text-xs text-muted-foreground">
              Nenhuma data bloqueada. Clique no calendário ou nos feriados acima.
            </p>
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {value.map((d) => (
                <span
                  key={d}
                  className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-2.5 py-1 text-xs"
                >
                  <span>{formatBR(d)}</span>
                  {holidayMap.get(d) && (
                    <span className="text-muted-foreground">· {holidayMap.get(d)}</span>
                  )}
                  <button
                    type="button"
                    onClick={() => toggle(d)}
                    className="text-muted-foreground hover:text-destructive"
                    aria-label={`Remover ${d}`}
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
