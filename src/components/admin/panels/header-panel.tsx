import { PanelTop } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  BilingualText,
  Card,
  Field,
  ImageField,
  PanelShell,
  SaveBar,
  TextField,
  useSection,
} from "../fields";

// Example targets shown as placeholders, in step with the default menu links.
const NAV_LINK_PLACEHOLDERS = [
  "/#projet",
  "/residence/al-bahia#galerie",
  "/residence/al-bahia#prix",
  "/residence/al-bahia#emplacement",
  "/#contact",
];

export function HeaderPanel() {
  const s = useSection("header");
  const d = s.draft;

  return (
    <PanelShell
      title="Header & Brand"
      description="Logo, agency name, contact details, social links and the navigation menu."
      icon={<PanelTop className="h-5 w-5" />}
    >
      <div className="space-y-5">
        <Card title="Identity">
          <div className="grid gap-4 sm:grid-cols-2">
            <TextField label="Brand name" value={d.brand} onChange={(v) => s.patch({ brand: v })} />
            <Field label="Brand name (العربية)">
              <Input
                dir="rtl"
                style={{ fontFamily: "Reem Kufi, sans-serif" }}
                value={d.brandAr}
                onChange={(e) => s.patch({ brandAr: e.target.value })}
              />
            </Field>
          </div>
          <div className="mt-4">
            <ImageField
              label="Logo"
              value={d.logo}
              onChange={(url) => s.patch({ logo: url })}
              aspect="aspect-square"
              hint="Square or transparent PNG/WebP works best."
              maxDim={512}
            />
          </div>
        </Card>

        <Card
          title="Contact details"
          description="Shown in the header, contact section and footer."
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <TextField label="Email" value={d.email} onChange={(v) => s.patch({ email: v })} />
            <TextField label="Phone" value={d.phone} onChange={(v) => s.patch({ phone: v })} />
            <TextField
              label="Address line 1"
              value={d.addressLine1}
              onChange={(v) => s.patch({ addressLine1: v })}
            />
            <TextField
              label="Address line 2"
              value={d.addressLine2}
              onChange={(v) => s.patch({ addressLine2: v })}
            />
          </div>
        </Card>

        <Card title="Social links">
          <div className="grid gap-4 sm:grid-cols-3">
            <TextField
              label="WhatsApp URL"
              value={d.whatsapp}
              onChange={(v) => s.patch({ whatsapp: v })}
            />
            <TextField
              label="Instagram URL"
              value={d.instagram}
              onChange={(v) => s.patch({ instagram: v })}
            />
            <TextField
              label="Facebook URL"
              value={d.facebook}
              onChange={(v) => s.patch({ facebook: v })}
            />
          </div>
        </Card>

        <Card
          title="Navigation menu"
          description="The five links in the overlay menu — label and where each one points."
        >
          <div className="space-y-5">
            {d.nav.map((item, i) => {
              const links = d.navLinks ?? [];
              const setLink = (v: string) =>
                s.patch({
                  navLinks: Array.from({ length: d.nav.length }, (_, j) =>
                    j === i ? v : (links[j] ?? ""),
                  ),
                });
              return (
                <div key={i} className="space-y-2.5 rounded-lg border bg-background/40 p-3">
                  <BilingualText
                    label={`Link ${i + 1}`}
                    value={item}
                    onChange={(v) => s.patch({ nav: d.nav.map((n, j) => (j === i ? v : n)) })}
                  />
                  <TextField
                    label="Link / path"
                    value={links[i] ?? ""}
                    onChange={setLink}
                    placeholder={NAV_LINK_PLACEHOLDERS[i] ?? "Leave empty for the default"}
                    hint="Empty = default section. Use an in-page anchor (#emplacement), an internal path (/residence/al-bahia#emplacement) or a full URL (https://…, opens in a new tab)."
                  />
                </div>
              );
            })}
          </div>
        </Card>
      </div>

      <SaveBar dirty={s.dirty} saving={s.saving} onSave={s.commit} onDiscard={s.discard} />
    </PanelShell>
  );
}
