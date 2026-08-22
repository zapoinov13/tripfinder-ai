import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/operator/api")({
  beforeLoad: () => {
    throw redirect({ to: "/operator/tours", search: { add: "api" } });
  },
});
