import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { resolveShopLogin, recordShopLoginResult, wrapPassword } from "@/lib/shop-admin.functions";
import { Lock, User } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/$slug/entrar")({
  component: ShopLoginPage,
  head: () => ({ meta: [{ title: "Entrar" }] }),
});

function ShopLoginPage() {
  const { slug } = Route.useParams();
  const navigate = useNavigate();
  const resolve = useServerFn(resolveShopLogin);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password) return;
    setLoading(true);
    try {
      // sign out qualquer sessão antiga
      await supabase.auth.signOut();
      const { email } = await resolve({ data: { slug, username: username.trim() } });
      const { error } = await supabase.auth.signInWithPassword({ email, password: wrapPassword(password) });
      if (error) throw new Error("Usuário ou senha inválidos");
      toast.success("Bem-vindo!");
      navigate({ to: "/$slug/admin", params: { slug } });
    } catch (err: any) {
      toast.error(err.message ?? "Falha no login");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="dark min-h-screen grid place-items-center bg-background text-foreground p-4">
      <form
        onSubmit={submit}
        className="w-full max-w-sm rounded-2xl border border-border bg-card p-6 shadow-lg"
      >
        <div className="mb-6 text-center">
          <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-primary/15 text-primary">
            <Lock className="h-5 w-5" />
          </div>
          <h1 className="mt-3 text-lg font-semibold">Acesso do painel</h1>
          <p className="text-xs text-muted-foreground">/{slug}</p>
        </div>

        <label className="block text-sm">
          <span className="mb-1 flex items-center gap-1.5 text-muted-foreground">
            <User className="h-3.5 w-3.5" /> Usuário
          </span>
          <input
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            autoComplete="username"
            autoFocus
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          />
        </label>

        <label className="mt-3 block text-sm">
          <span className="mb-1 flex items-center gap-1.5 text-muted-foreground">
            <Lock className="h-3.5 w-3.5" /> Senha
          </span>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          />
        </label>

        <button
          type="submit"
          disabled={loading}
          className="mt-5 w-full rounded-md bg-primary py-2.5 text-sm font-medium text-primary-foreground disabled:opacity-60"
        >
          {loading ? "Entrando…" : "Entrar"}
        </button>

        <p className="mt-4 text-center text-[11px] text-muted-foreground">
          Não tem acesso? Fale com o administrador do sistema.
        </p>
      </form>
    </div>
  );
}
