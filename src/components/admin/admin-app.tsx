import { useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import type { Content } from "@/lib/cms/types";
import { checkAuthFn, logoutFn } from "@/lib/cms/api";
import { Toaster } from "@/components/ui/sonner";
import { AdminProvider } from "./context";
import { Dashboard } from "./dashboard";
import { Login } from "./login";
import { onUnauthorized } from "./unauthorized";

const AUTH_KEY = ["admin", "auth"] as const;

export function AdminApp({ initialContent }: { initialContent: Content }) {
  const qc = useQueryClient();
  const { data, isPending } = useQuery({
    queryKey: AUTH_KEY,
    queryFn: () => checkAuthFn(),
  });

  // When a server call reports the session expired, overlay a re-login prompt on
  // top of the (still-mounted) dashboard so in-progress edits aren't lost.
  const [reauth, setReauth] = useState(false);
  const reauthRef = useRef(false);
  useEffect(
    () =>
      onUnauthorized(() => {
        if (reauthRef.current) return;
        reauthRef.current = true;
        setReauth(true);
        toast.error("Your session expired. Sign in again — your edits are kept.");
      }),
    [],
  );

  const invalidateAuth = () => qc.invalidateQueries({ queryKey: AUTH_KEY });

  function handleReauthSuccess() {
    reauthRef.current = false;
    setReauth(false);
    invalidateAuth();
  }

  async function handleLogout() {
    await logoutFn();
    qc.removeQueries({ queryKey: ["admin"] });
    reauthRef.current = false;
    setReauth(false);
    invalidateAuth();
  }

  let body: React.ReactNode;
  if (isPending) {
    body = (
      <div className="grid min-h-screen place-items-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  } else if (!data?.authed) {
    body = <Login onSuccess={invalidateAuth} />;
  } else {
    body = (
      <AdminProvider initialContent={initialContent} role={data.role} userId={data.userId}>
        <Dashboard onLogout={handleLogout} />
        {reauth && (
          <div className="fixed inset-0 z-[100] bg-background/95 backdrop-blur-sm">
            <Login onSuccess={handleReauthSuccess} />
          </div>
        )}
      </AdminProvider>
    );
  }

  return (
    <>
      {body}
      <Toaster richColors position="top-center" />
    </>
  );
}
