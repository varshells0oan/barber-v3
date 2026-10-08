import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/cadastro")({
  beforeLoad: () => {
    throw redirect({ to: "/barbeiro/cadastro", replace: true });
  },
});
