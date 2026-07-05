export const brl = (n: number | string) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Number(n));

export const cleanPhone = (p: string) => (p || "").replace(/\D/g, "");

export const formatPhone = (p: string) => {
  const c = cleanPhone(p);
  if (c.length === 11) return `(${c.slice(0, 2)}) ${c.slice(2, 7)}-${c.slice(7)}`;
  if (c.length === 10) return `(${c.slice(0, 2)}) ${c.slice(2, 6)}-${c.slice(6)}`;
  return p;
};

export const todayISO = () => new Date().toISOString().slice(0, 10);

export const timeToMin = (t: string) => {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
};

export const minToTime = (m: number) => {
  const h = Math.floor(m / 60);
  const mm = m % 60;
  return `${String(h).padStart(2, "0")}:${String(mm).padStart(2, "0")}`;
};

export const formatDateBR = (iso: string) => {
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
};

export const STATUS_LABEL: Record<string, string> = {
  pendente: "Pendente",
  confirmado: "Confirmado",
  atendido: "Atendido",
  cancelado: "Cancelado",
  nao_compareceu: "Não compareceu",
};

export const STATUS_COLOR: Record<string, string> = {
  pendente: "bg-amber-100 text-amber-800",
  confirmado: "bg-blue-100 text-blue-800",
  atendido: "bg-emerald-100 text-emerald-800",
  cancelado: "bg-rose-100 text-rose-800",
  nao_compareceu: "bg-slate-100 text-slate-700",
};
