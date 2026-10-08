import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/b/$slug")({
  beforeLoad: ({ params }) => {
    throw redirect({ to: "/cliente/$slug", params: { slug: params.slug }, replace: true });
  },
});
