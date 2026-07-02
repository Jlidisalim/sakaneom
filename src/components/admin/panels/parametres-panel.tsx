// ────────────────────────────────────────────────────────────────────────────
// PARAMÈTRES — agency profile, default currency and a read-only roles reference.
// Local draft form seeded from useSettings(); saved via updateSettingsFn with the
// shared QK.settings invalidation. Write controls gated on can("settings").
// ────────────────────────────────────────────────────────────────────────────
import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Coins, Loader2, Save, Settings as SettingsIcon, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import type { Settings } from "@/lib/promo/types";
import { ROLES, ROLE_LABELS, ROLE_DESCRIPTIONS } from "@/lib/promo/permissions";
import { errorMessageFr } from "../unauthorized";
import { QK, updateSettingsFn, useSettings } from "../promo/hooks";
import { useAdmin } from "../context";
import { Card, Field, ImageField, PanelShell, TextField } from "../fields";
import { CurrencyField } from "../promo/form-fields";

const EMPTY_DRAFT: Settings = {
  companyName: "",
  logo: "",
  email: "",
  phone: "",
  adresse: "",
  ville: "",
  defaultCurrency: "TND",
  matriculeFiscal: "",
};

export function ParametresPanel() {
  const { can } = useAdmin();
  const writable = can("settings");
  const qc = useQueryClient();
  const settings = useSettings();

  const [draft, setDraft] = useState<Settings>(EMPTY_DRAFT);

  // Seed the local draft whenever the server copy loads or changes externally.
  useEffect(() => {
    if (settings.data) setDraft({ ...EMPTY_DRAFT, ...settings.data });
  }, [settings.data]);

  const save = useMutation({
    mutationFn: () => updateSettingsFn({ data: draft }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QK.settings });
      toast.success("Paramètres enregistrés");
    },
    onError: (err) => toast.error(errorMessageFr(err, "L'enregistrement a échoué. Réessayez.")),
  });

  const set = <K extends keyof Settings>(key: K, value: Settings[K]) =>
    setDraft((d) => ({ ...d, [key]: value }));

  return (
    <PanelShell
      title="Paramètres"
      description="Profil de l'agence, devise par défaut et référence des rôles."
      icon={<SettingsIcon className="h-5 w-5" />}
    >
      <div className="space-y-5">
        <Card
          title="Profil de l'agence"
          description="Ces informations apparaissent sur les reçus et documents générés."
        >
          {settings.isLoading ? (
            <div className="flex items-center gap-2 py-8 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Chargement…
            </div>
          ) : (
            <div className="space-y-4">
              <ImageField
                label="Logo"
                value={draft.logo}
                onChange={(url) => set("logo", url)}
                aspect="aspect-square"
                hint="Format carré recommandé."
              />

              <TextField
                label="Nom de l'agence"
                value={draft.companyName}
                onChange={(v) => set("companyName", v)}
                placeholder="SAKANEOM Promotion"
              />

              <div className="grid gap-4 sm:grid-cols-2">
                <TextField
                  label="E-mail"
                  type="email"
                  value={draft.email}
                  onChange={(v) => set("email", v)}
                  placeholder="contact@sakaneom.tn"
                />
                <TextField
                  label="Téléphone"
                  value={draft.phone}
                  onChange={(v) => set("phone", v)}
                  placeholder="+216 …"
                />
              </div>

              <TextField
                label="Adresse"
                value={draft.adresse}
                onChange={(v) => set("adresse", v)}
              />

              <div className="grid gap-4 sm:grid-cols-2">
                <TextField label="Ville" value={draft.ville} onChange={(v) => set("ville", v)} />
                <CurrencyField
                  label="Devise par défaut"
                  value={draft.defaultCurrency}
                  onChange={(v) => set("defaultCurrency", v)}
                />
              </div>

              <TextField
                label="Matricule fiscal"
                value={draft.matriculeFiscal}
                onChange={(v) => set("matriculeFiscal", v)}
                hint="Identifiant fiscal affiché sur les reçus."
              />

              <div className="flex items-center justify-end gap-2 pt-1">
                <Button
                  size="sm"
                  disabled={!writable || save.isPending}
                  onClick={() => save.mutate()}
                >
                  {save.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4" />
                  )}
                  Enregistrer
                </Button>
              </div>
              {!writable && (
                <p className="text-right text-xs text-muted-foreground">
                  Seul le Super Admin peut modifier les paramètres.
                </p>
              )}
            </div>
          )}
        </Card>

        <Card
          title="Rôles & accès"
          description="Référence des cinq rôles du back-office (lecture seule)."
        >
          <div className="overflow-hidden rounded-control border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-secondary/40 text-left text-xs text-muted-foreground">
                  <th className="px-3 py-2 font-medium">Rôle</th>
                  <th className="px-3 py-2 font-medium">Accès</th>
                </tr>
              </thead>
              <tbody>
                {ROLES.map((role) => (
                  <tr key={role} className="border-b last:border-b-0 align-top">
                    <td className="whitespace-nowrap px-3 py-2.5">
                      <span className="flex items-center gap-2 font-medium text-foreground">
                        <ShieldCheck className="h-4 w-4 text-stone" />
                        {ROLE_LABELS[role]}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-muted-foreground">{ROLE_DESCRIPTIONS[role]}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        <Card className="flex items-start gap-3">
          <span className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-control border bg-secondary text-stone">
            <Coins className="h-4 w-4" />
          </span>
          <div>
            <Field label="Devise">
              <p className="text-sm text-muted-foreground">
                Le Dinar tunisien (TND) est la devise par défaut de l'agence. Chaque projet peut
                toutefois définir sa propre devise (par ex. l'Euro pour les ventes internationales)
                ; les montants sont alors affichés et calculés dans la devise du projet.
              </p>
            </Field>
          </div>
        </Card>
      </div>
    </PanelShell>
  );
}
