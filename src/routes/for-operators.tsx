import { createFileRoute, redirect } from "@tanstack/react-router";

/** Старый адрес: в интерфейсе теперь «Для турфирм». */
export const Route = createFileRoute("/for-operators")({
  beforeLoad: () => {
    throw redirect({ to: "/for-companies" });
  },
});
