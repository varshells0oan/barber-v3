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
  pendente: "Agendado",
  agendado: "Agendado",
  confirmado: "Confirmado",
  em_atendimento: "Em atendimento",
  atendido: "Concluído",
  concluido: "Concluído",
  cancelado: "Cancelado",
  nao_compareceu: "Não compareceu",
};

/** Status que ainda ocupam a agenda e podem ser alterados. */
export const OPEN_STATUSES = ["pendente", "agendado", "confirmado", "em_atendimento"];
/** Status considerados "atendimento realizado" (compatível com dados antigos). */
export const DONE_STATUSES = ["atendido", "concluido"];

export const STATUS_COLOR: Record<string, string> = {
  pendente: "bg-amber-100 text-amber-800",
  agendado: "bg-amber-100 text-amber-800",
  confirmado: "bg-sky-100 text-sky-800",
  em_atendimento: "bg-violet-100 text-violet-800",
  atendido: "bg-emerald-100 text-emerald-800",
  concluido: "bg-emerald-100 text-emerald-800",
  cancelado: "bg-rose-100 text-rose-800",
  nao_compareceu: "bg-stone-200 text-stone-700",
};

export const ACCOUNT_STATUS_LABEL: Record<string, string> = {
  pending_approval: "Aguardando aprovação",
  trial: "Em teste",
  active: "Ativa",
  past_due: "Pagamento atrasado",
  suspended: "Suspensa",
  cancelled: "Cancelada",
};
