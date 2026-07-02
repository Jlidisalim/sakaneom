// ────────────────────────────────────────────────────────────────────────────
// Demo data seeder.   bun scripts/seed.ts   (or: npm run seed)
//
// NON-DESTRUCTIVE: collections are only populated when empty; the 5 role users
// are created only if missing (by email). Re-running never wipes data.
// Seeds: 5 role users, agency settings, a few web inquiries (Demandes web) and a
// few rendez-vous.
// ────────────────────────────────────────────────────────────────────────────
import { addUser, getUserByEmail } from "@/server/users";
import { rendezvous, writeSettings } from "@/server/promo-store";
import { addLead, readLeads } from "@/server/store";

const log = (msg: string) => console.log(`[seed] ${msg}`);

function isoDaysFromNow(days: number, hour = 10): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  d.setHours(hour, 0, 0, 0);
  return d.toISOString();
}

const DEMO_USERS = [
  {
    nom: "Nadia Ben Salah",
    email: "super@sakaneom.tn",
    role: "super_admin",
    password: "SuperAdmin#2026",
    phone: "+216 20 100 100",
  },
  {
    nom: "Karim Trabelsi",
    email: "directeur@sakaneom.tn",
    role: "manager",
    password: "Directeur#2026",
    phone: "+216 20 200 200",
  },
  {
    nom: "Yasmine Gharbi",
    email: "commercial@sakaneom.tn",
    role: "commercial",
    password: "Commercial#2026",
    phone: "+216 20 300 300",
  },
  {
    nom: "Mohamed Aziz",
    email: "comptable@sakaneom.tn",
    role: "comptable",
    password: "Comptable#2026",
    phone: "+216 20 400 400",
  },
  {
    nom: "Sonia Mahjoub",
    email: "lecture@sakaneom.tn",
    role: "lecture",
    password: "Lecture#2026",
    phone: "+216 20 500 500",
  },
] as const;

async function seedUsers(): Promise<Record<string, string>> {
  const idByEmail: Record<string, string> = {};
  for (const u of DEMO_USERS) {
    const existing = await getUserByEmail(u.email);
    if (existing) {
      idByEmail[u.email] = existing.id;
      log(`user ${u.email} already exists — keep`);
      continue;
    }
    const created = await addUser({
      nom: u.nom,
      email: u.email,
      role: u.role,
      phone: u.phone,
      active: true,
      password: u.password,
    });
    idByEmail[u.email] = created.id;
    log(`created user ${u.email} (${u.role})`);
  }
  return idByEmail;
}

async function seedLeads() {
  if ((await readLeads()).length > 0) {
    log("leads non vides — skip");
    return;
  }
  const data = [
    {
      name: "Olfa Saidi",
      email: "olfa.saidi@email.tn",
      phone: "+216 22 111 222",
      source: "contact" as const,
      message: "Intéressée par un S+2.",
    },
    {
      name: "Walid Mansour",
      email: "walid.mansour@email.tn",
      phone: "+216 23 222 333",
      source: "info-panel" as const,
      apt: "A-04",
    },
    {
      name: "Ines Hamdi",
      email: "ines.hamdi@email.tn",
      phone: "+216 24 333 444",
      source: "contact" as const,
      message: "Demande de brochure.",
    },
    {
      name: "Bilel Toumi",
      email: "bilel.toumi@email.tn",
      phone: "+216 25 444 555",
      source: "info-panel" as const,
      apt: "B-12",
    },
    {
      name: "Sana Karoui",
      email: "sana.karoui@email.tn",
      phone: "+216 26 555 666",
      source: "contact" as const,
      message: "Disponibilités et prix ?",
    },
  ];
  for (const l of data) await addLead(l);
  log(`created ${data.length} demandes web (leads)`);
}

async function seedRendezVous(commercialId: string, managerId: string) {
  if ((await rendezvous.list()).length > 0) {
    log("rendez-vous non vides — skip");
    return;
  }
  const items = [
    {
      type: "visite" as const,
      in: 1,
      statut: "confirme" as const,
      contact: "Olfa Saidi",
      objet: "Visite appartement témoin",
    },
    {
      type: "visite" as const,
      in: 2,
      statut: "planifie" as const,
      contact: "Walid Mansour",
      objet: "Visite chantier",
    },
    {
      type: "reunion" as const,
      in: 3,
      statut: "planifie" as const,
      contact: "Ines Hamdi",
      objet: "Présentation du projet",
    },
    {
      type: "signature" as const,
      in: 5,
      statut: "confirme" as const,
      contact: "Bilel Toumi",
      objet: "Signature réservation",
    },
    {
      type: "visite" as const,
      in: 7,
      statut: "planifie" as const,
      contact: "Sana Karoui",
      objet: "Visite showroom",
    },
    {
      type: "reunion" as const,
      in: -3,
      statut: "realise" as const,
      contact: "Hatem Jaziri",
      objet: "Suivi dossier",
    },
  ];
  for (let i = 0; i < items.length; i++) {
    const it = items[i];
    await rendezvous.add({
      type: it.type,
      date: isoDaysFromNow(it.in),
      agentId: i % 2 === 0 ? commercialId : managerId,
      contact: it.contact,
      objet: it.objet,
      statut: it.statut,
      notes: "",
    });
  }
  log(`created ${items.length} rendez-vous`);
}

async function seedSettings() {
  await writeSettings({
    companyName: "SAKANEOM Promotion",
    email: "contact@sakaneom.tn",
    phone: "+216 71 000 000",
    adresse: "Les Berges du Lac, Tunis",
    ville: "Tunis",
    defaultCurrency: "TND",
    matriculeFiscal: "1234567/A/M/000",
  });
  log("settings written");
}

async function main() {
  log("seeding demo data (non-destructive)…");
  const userIds = await seedUsers();
  await seedLeads();
  await seedRendezVous(userIds["commercial@sakaneom.tn"], userIds["directeur@sakaneom.tn"]);
  await seedSettings();

  log("done. Default logins:");
  for (const u of DEMO_USERS) console.log(`  ${u.role.padEnd(12)} ${u.email}  /  ${u.password}`);
}

main().then(
  () => process.exit(0),
  (err) => {
    console.error("[seed] FAILED", err);
    process.exit(1);
  },
);
