import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/painel")({
  beforeLoad: () => {
    throw redirect({ to: "/dono", replace: true });
  },
});
