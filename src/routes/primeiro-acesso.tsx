import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { completeOwnerSetup } from "@/lib/owner-setup.functions";

export const Route = createFileRoute("/primeiro-acesso")({
  head: () => ({
    meta: [
      { title: "Primeiro acesso do dono da plataforma" },
      { name: "description", content: "Defina a senha da conta principal da plataforma." },
      { property: "og:title", content: "Primeiro acesso do dono da plataforma" },
      { property: "og:description", content: "Defina a senha da conta principal da plataforma." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: Page,
});

function Page() {
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [done, setDone] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr("");
    if (pw !== pw2) return setErr("As senhas não coincidem.");
    setBusy(true);
    try {
      await completeOwnerSetup({ data: { email, code, password: pw } });
      setDone(true);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Erro inesperado.");
    } finally {
      setBusy(false);
    }
  }

  const input = "w-full rounded-md border border-input bg-background px-3 py-2 text-sm";
  return (
    <div className="dark grid min-h-screen place-items-center bg-background p-4 text-foreground">
      <div className="w-full max-w-sm rounded-xl border border-border bg-card p-6">
        <h1 className="text-xl font-semibold">Primeiro acesso</h1>
        {done ? (
          <div className="mt-4 space-y-4 text-sm">
            <p>Senha definida. O código foi invalidado.</p>
            <Link to="/auth" className="inline-block rounded-md bg-primary px-4 py-2 text-primary-foreground">Ir para o login</Link>
          </div>
        ) : (
          <form onSubmit={submit} className="mt-4 space-y-3">
            <input className={input} type="email" placeholder="E-mail da conta" value={email} onChange={(e) => setEmail(e.target.value)} required />
            <input className={input} placeholder="Código de primeiro acesso" value={code} onChange={(e) => setCode(e.target.value)} required />
            <input className={input} type="password" placeholder="Nova senha (mín. 8)" value={pw} onChange={(e) => setPw(e.target.value)} minLength={8} required />
            <input className={input} type="password" placeholder="Repita a senha" value={pw2} onChange={(e) => setPw2(e.target.value)} minLength={8} required />
            {err && <p className="text-sm text-destructive">{err}</p>}
            <button disabled={busy} className="w-full rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground disabled:opacity-60">
              {busy ? "Salvando…" : "Definir senha"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
