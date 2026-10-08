import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Scissors, CheckCircle2 } from "lucide-react";
import { registerBarbershop } from "@/lib/signup.functions";

export const Route = createFileRoute("/barbeiro/cadastro")({
  head: () => ({
    meta: [
      { title: "Cadastre sua barbearia — BarberSaaS" },
      { name: "description", content: "Crie a conta da sua barbearia e comece a receber agendamentos online." },
      { property: "og:title", content: "Cadastre sua barbearia — BarberSaaS" },
      { property: "og:description", content: "Agenda online, clientes e equipe da sua barbearia em um só lugar." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Cadastro,
});

function Cadastro() {
  const register = useServerFn(registerBarbershop);
  const [f, setF] = useState({ ownerName: "", shopName: "", phone: "", email: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement>) => setF({ ...f, [k]: e.target.value });

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await register({ data: f });
      setDone(true);
    } catch (err: any) {
      toast.error(err.message ?? "Erro no cadastro");
    } finally {
      setLoading(false);
    }
  };

  const input = "w-full rounded-md border border-input bg-background px-4 py-3 text-base";

  return (
    <div className="dark min-h-screen bg-background text-foreground">
      <div className="mx-auto max-w-md px-4 py-12">
        <Link to="/" className="mb-8 flex items-center gap-2">
          <div className="grid h-9 w-9 place-items-center rounded-lg bg-primary text-primary-foreground"><Scissors className="h-4 w-4" /></div>
          <span className="font-semibold">BarberSaaS</span>
        </Link>
        {done ? (
          <div className="rounded-xl border border-border bg-card p-6 text-center">
            <CheckCircle2 className="mx-auto h-10 w-10 text-primary" />
            <h1 className="mt-3 text-xl font-semibold">Cadastro recebido!</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Sua barbearia está aguardando aprovação. Assim que for aprovada, você poderá entrar com seu e-mail ou telefone e senha.
            </p>
            <Link to="/auth" className="mt-5 inline-block rounded-md bg-primary px-5 py-3 font-medium text-primary-foreground">Ir para o login</Link>
          </div>
        ) : (
          <>
            <h1 className="text-2xl font-semibold">Cadastre sua barbearia</h1>
            <p className="mt-1 text-sm text-muted-foreground">Leva menos de 1 minuto.</p>
            <form onSubmit={submit} className="mt-6 space-y-3">
              <input className={input} required placeholder="Seu nome (responsável)" value={f.ownerName} onChange={set("ownerName")} />
              <input className={input} required placeholder="Nome da barbearia" value={f.shopName} onChange={set("shopName")} />
              <input className={input} required inputMode="tel" placeholder="Telefone / WhatsApp com DDD" value={f.phone} onChange={set("phone")} />
              <input className={input} required type="email" placeholder="E-mail" value={f.email} onChange={set("email")} />
              <input className={input} required type="password" minLength={6} placeholder="Senha (mínimo 6 caracteres)" value={f.password} onChange={set("password")} />
              <button disabled={loading} className="w-full rounded-md bg-primary py-3 text-base font-medium text-primary-foreground disabled:opacity-60">
                {loading ? "Enviando..." : "Criar cadastro"}
              </button>
            </form>
            <Link to="/auth" className="mt-4 block text-center text-sm text-muted-foreground hover:text-foreground">Já tenho conta — entrar</Link>
          </>
        )}
      </div>
    </div>
  );
}
