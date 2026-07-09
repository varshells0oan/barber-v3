import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Scissors } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/auth")({
  ssr: false,
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [currentEmail, setCurrentEmail] = useState<string | null>(null);

  const routeAfterLogin = async (userId: string) => {
    // Se for o email do superadmin e ainda não tiver a role, faz o claim.
    const { data: userRes } = await supabase.auth.getUser();
    const email = userRes.user?.email?.toLowerCase();
    if (email === "superadmin@icloud.com") {
      const { error: claimError } = await supabase.rpc("claim_superadmin");
      if (claimError) throw claimError;
    }

    const { data: roles, error: rolesError } = await supabase
      .from("user_roles")
      .select("role, barbershop_id")
      .eq("user_id", userId);
    if (rolesError) throw rolesError;
    const list = (roles ?? []) as Array<{ role: string; barbershop_id: string | null }>;


    if (list.some((r) => r.role === "superadmin")) {
      return navigate({ to: "/superadmin", replace: true });
    }

    const barberRow = list.find((r) => r.role === "barber" && r.barbershop_id);
    const adminRow = list.find((r) => r.role === "admin" && r.barbershop_id);
    const target = adminRow ?? barberRow;

    if (!target?.barbershop_id) {
      // Sem role/barbearia: fica em /auth para permitir novo login ou logout.
      return;
    }

    const { data: shop } = await supabase
      .from("barbershops")
      .select("slug")
      .eq("id", target.barbershop_id)
      .maybeSingle();
    if (!shop?.slug) return;

    if (adminRow) {
      return navigate({ to: "/$slug/admin", params: { slug: shop.slug }, replace: true });
    }
    return navigate({ to: "/$slug/barbeiro", params: { slug: shop.slug }, replace: true });
  };

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      if (data.session?.user) {
        setCurrentEmail(data.session.user.email ?? null);
        await routeAfterLogin(data.session.user.id);
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
    setCurrentEmail(null);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: `${window.location.origin}/auth` },
        });
        if (error) throw error;
        toast.success("Conta criada! O superadmin precisa vincular sua conta a uma barbearia.");
        if (data.user) await routeAfterLogin(data.user.id);
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        const { data: userRes } = await supabase.auth.getUser();
        if (userRes.user) await routeAfterLogin(userRes.user.id);
      }

    } catch (e: any) {
      toast.error(e.message ?? "Erro na autenticação");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="dark min-h-screen bg-background text-foreground">
      <div className="mx-auto max-w-md px-4 py-16">
        <Link to="/" className="mb-8 flex items-center gap-2 text-foreground">
          <div className="grid h-9 w-9 place-items-center rounded-lg bg-primary text-primary-foreground">
            <Scissors className="h-4 w-4" />
          </div>
          <span className="font-semibold">BarberSaaS</span>
        </Link>
        <h1 className="text-2xl font-semibold text-foreground">
          {mode === "signin" ? "Entrar" : "Criar conta"}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Acesso da equipe (admin/barbeiro)
        </p>
        {currentEmail && (
          <div className="mt-4 flex items-center justify-between rounded-md border border-border bg-card/40 px-3 py-2 text-xs">
            <span className="truncate text-muted-foreground">Logado como {currentEmail} (sem acesso)</span>
            <button onClick={signOut} className="rounded border border-border px-2 py-1 hover:bg-accent/40">Sair</button>
          </div>
        )}
        <form onSubmit={submit} className="mt-6 space-y-3">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            placeholder="Email"
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          />
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
            placeholder="Senha"
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          />
          <button
            disabled={loading}
            className="w-full rounded-md bg-primary py-2.5 font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
          >
            {loading ? "Aguarde..." : mode === "signin" ? "Entrar" : "Criar conta"}
          </button>
        </form>
        <button
          onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
          className="mt-4 w-full text-sm text-muted-foreground hover:text-foreground"
        >
          {mode === "signin" ? "Ainda não tem conta? Criar" : "Já tem conta? Entrar"}
        </button>
        <p className="mt-6 text-center text-xs text-muted-foreground">
          A primeira conta criada vira administradora automaticamente.
        </p>
      </div>
    </div>
  );
}
