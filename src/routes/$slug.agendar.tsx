import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/$slug/agendar")({
  beforeLoad: ({ params }) => {
    throw redirect({ to: "/$slug", params: { slug: params.slug } });
  },
});
