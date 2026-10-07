import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { hashInviteToken } from "@/lib/invite-token";
import { toast } from "sonner";
import { Scissors, Loader2 } from "lucide-react";

const searchSchema = z.object({ token: z.string().min(16) });

export const Route = createFileRoute("/aceitar-convite")({
  ssr: false,
  validateSearch: searchSchema,
  component: AcceptInvitePage,
});

function AcceptInvitePage() {
  const navigate = useNavigate();
  const { token } = Route.useSearch();
  const [loading, setLoading] = useState(true);
  const [invite, setInvite] = useState<{ email: string; barbershop_name: string; barbershop_slug: string; status: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tokenHash, setTokenHash] = useState<string>("");

  const [mode, setMode] = useState<"signin" | "signup">("signup");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [sessionEmail, setSessionEmail] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const h = await hashInviteToken(token);
        setTokenHash(h);
        const { data, error } = await supabase.rpc("get_invite_by_hash", { _token_hash: h });
        if (error) throw error;
        const row = (data as any[])?.[0];
        if (!row) { setError("Convite não encontrado."); return; }
        if (row.status !== "pending") { setError(`Convite ${row.status === "accepted" ? "já aceito" : "cancelado"}.`); setInvite(row); return; }
        if (new Date(row.expires_at) < new Date()) { setError("Convite expirado."); return; }
        setInvite(row);
        const { data: u } = await supabase.auth.getUser();
        setSessionEmail(u.user?.email?.toLowerCase() ?? null);
        if (u.user) setMode("signin");
      } catch (e: any) {
        setError(e.message ?? "Erro ao carregar convite");
      } finally {
        setLoading(false);
      }
    })();
  }, [token]);

  const accept = async () => {
    const { data, error } = await supabase.rpc("accept_barbershop_invite", { _token_hash: tokenHash });
    if (error) throw error;
    const slug = data as string;
    toast.success("Convite aceito!");
    navigate({ to: "/barbeiro/$slug/admin", params: { slug } });
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!invite) return;
    setBusy(true);
    try {
      if (!sessionEmail) {
        if (mode === "signup") {
          const { error } = await supabase.auth.signUp({
            email: invite.email, password,
            options: { emailRedirectTo: `${window.location.origin}/aceitar-convite?token=${token}` },
          });
          if (error) throw error;
        } else {
          const { error } = await supabase.auth.signInWithPassword({ email: invite.email, password });
          if (error) throw error;
        }
        const { data: u } = await supabase.auth.getUser();
        if (!u.user) { toast.message("Confirme seu email e volte a este link."); return; }
      }
      await accept();
    } catch (e: any) {
      toast.error(e.message ?? "Erro");
    } finally {
      setBusy(false);
    }
  };

  const acceptExisting = async () => {
    setBusy(true);
    try { await accept(); } catch (e: any) { toast.error(e.message ?? "Erro"); } finally { setBusy(false); }
  };

  return (
    <div className="dark min-h-screen bg-background text-foreground">
      <div className="mx-auto max-w-md px-4 py-16">
        <div className="mb-6 flex items-center gap-2">
          <div className="grid h-9 w-9 place-items-center rounded-lg bg-primary text-primary-foreground">
            <Scissors className="h-4 w-4" />
          </div>
          <span className="font-semibold">Convite de administrador</span>
        </div>

        {loading && <div className="flex items-center gap-2 text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Carregando…</div>}

        {!loading && error && (
          <div className="rounded-md border border-destructive/40 bg-destructive/10 p-4 text-sm">{error}</div>
        )}

        {!loading && !error && invite && (
          <div className="rounded-xl border border-border bg-card p-5">
            <p className="text-sm text-muted-foreground">Você foi convidado para administrar</p>
            <h1 className="mt-1 text-xl font-semibold">{invite.barbershop_name}</h1>
            <p className="mt-4 text-sm">
              Convite para <span className="font-medium">{invite.email}</span>
            </p>

            {sessionEmail && sessionEmail !== invite.email.toLowerCase() && (
              <p className="mt-4 rounded-md bg-amber-500/10 p-3 text-xs text-amber-500">
                Você está logado como {sessionEmail}. Saia e entre com {invite.email} para aceitar.
              </p>
            )}

            {sessionEmail === invite.email.toLowerCase() ? (
              <button onClick={acceptExisting} disabled={busy}
                className="mt-5 w-full rounded-md bg-primary py-2.5 font-medium text-primary-foreground disabled:opacity-60">
                {busy ? "Aceitando…" : "Aceitar convite"}
              </button>
            ) : !sessionEmail ? (
              <form onSubmit={submit} className="mt-5 space-y-3">
                <input value={invite.email} readOnly
                  className="w-full rounded-md border border-input bg-muted px-3 py-2 text-sm" />
                <input type="password" value={password} onChange={(e) => setPassword(e.target.value)}
                  required minLength={6} placeholder="Senha (mínimo 6)"
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
                <button disabled={busy}
                  className="w-full rounded-md bg-primary py-2.5 font-medium text-primary-foreground disabled:opacity-60">
                  {busy ? "Aguarde…" : mode === "signup" ? "Criar conta e aceitar" : "Entrar e aceitar"}
                </button>
                <button type="button" onClick={() => setMode(mode === "signup" ? "signin" : "signup")}
                  className="w-full text-xs text-muted-foreground hover:text-foreground">
                  {mode === "signup" ? "Já tenho conta com esse email" : "Ainda não tenho conta"}
                </button>
              </form>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
}
