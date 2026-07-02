import { MutationCache, QueryCache, QueryClient } from "@tanstack/react-query";
import { createRouter } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";
import { isUnauthorizedError, notifyUnauthorized } from "./components/admin/unauthorized";

export const getRouter = () => {
  // Any admin query/mutation that hits an expired session (requireAdmin throws
  // "UNAUTHORIZED") routes here once, so the admin shell can prompt a re-login.
  const onError = (err: unknown) => {
    if (isUnauthorizedError(err)) notifyUnauthorized();
  };
  const queryClient = new QueryClient({
    mutationCache: new MutationCache({ onError }),
    queryCache: new QueryCache({ onError }),
  });

  const router = createRouter({
    routeTree,
    context: { queryClient },
    scrollRestoration: true,
    defaultPreloadStaleTime: 0,
  });

  return router;
};
