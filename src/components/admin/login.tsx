import { useState } from "react";
import { KeyRound, Loader2, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { loginFn } from "@/lib/cms/api";

export function Login({ onSuccess }: { onSuccess: () => void }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(false);
    try {
      const { ok } = await loginFn({ data: { email, password } });
      if (ok) onSuccess();
      else setError(true);
    } catch {
      setError(true);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="admin-ui grid min-h-screen place-items-center bg-background px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="font-display text-3xl gold-text" style={{ letterSpacing: "0.28em" }}>
            SAKANEOM
          </div>
          <p className="mt-2 text-sm text-muted-foreground">Espace Administration</p>
        </div>

        <form
          onSubmit={submit}
          className="space-y-4 rounded-surface border bg-card p-6 shadow-[0_1px_2px_rgba(28,24,19,0.04)]"
        >
          <div className="space-y-1.5">
            <Label htmlFor="email">Email</Label>
            <div className="relative">
              <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="email"
                type="email"
                autoComplete="username"
                autoFocus
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="pl-9"
                placeholder="vous@agence.tn"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="pw">Mot de passe</Label>
            <div className="relative">
              <KeyRound className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="pw"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="pl-9"
                placeholder="••••••••"
              />
            </div>
            {error && (
              <p className="text-sm text-destructive">Identifiants incorrects. Réessayez.</p>
            )}
          </div>

          <Button type="submit" className="w-full" disabled={busy || !email || !password}>
            {busy && <Loader2 className="h-4 w-4 animate-spin" />}
            Se connecter
          </Button>
        </form>

        <p className="mt-4 text-center text-xs text-muted-foreground">
          Gérez vos projets, lots, prospects, ventes et contenus.
        </p>
      </div>
    </div>
  );
}
