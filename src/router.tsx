import { QueryClient } from "@tanstack/react-query";
import { createRouter } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";
import { installNativeServerFnProxy } from "@/lib/native/server-fn-proxy";

// До первого рендера: в нативном бандле server-function RPC должны уходить
// на прод, а не на capacitor://localhost. Вне нативной оболочки — no-op.
installNativeServerFnProxy();

export const getRouter = () => {
  const queryClient = new QueryClient();

  const router = createRouter({
    routeTree,
    context: { queryClient },
    scrollRestoration: true,
    defaultPreloadStaleTime: 0,
  });

  return router;
};
