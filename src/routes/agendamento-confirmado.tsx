import { createFileRoute, Link } from "@tanstack/react-router";
import { PublicHeader } from "@/components/PublicHeader";
import { CheckCircle2 } from "lucide-react";

export const Route = createFileRoute("/agendamento-confirmado")({
  component: Confirmed,
});

function Confirmed() {
  return (
    <div className="min-h-screen bg-background">
      <PublicHeader />
      <div className="mx-auto max-w-md px-4 py-16 text-center">
        <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-emerald-100 text-emerald-600">
          <CheckCircle2 className="h-8 w-8" />
        </div>
        <h1 className="mt-6 text-2xl font-semibold text-foreground">Agendamento enviado!</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Seu horário está reservado. Em breve confirmaremos por WhatsApp.
        </p>
        <div className="mt-8 flex flex-col gap-2">
          <Link
            to="/meus-agendamentos"
            className="rounded-md bg-primary py-3 font-medium text-primary-foreground hover:bg-primary/90"
          >
            Ver meus agendamentos
          </Link>
          <Link to="/" className="rounded-md border border-border py-3 font-medium">
            Voltar ao início
          </Link>
        </div>
      </div>
    </div>
  );
}
