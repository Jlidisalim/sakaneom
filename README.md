# SAKANEOM — Site vitrine + Espace Admin de promotion immobilière

Application **TanStack Start** (React 19 + Vite) qui combine :

1. un **site web vitrine** bilingue (FR/AR) pour présenter les résidences ;
2. un **espace administration** (`/admin`) : un **tableau de bord** (aperçu du
   site + statistiques), un module **Rendez-vous** (visites / réunions /
   signatures, vue liste + calendrier), les **Paramètres** de l'agence, et la
   gestion du **site web** (résidences, contenu, en-tête, demandes web).

Toute l'interface d'administration est en **français**, devise par défaut
**TND**, dates au format **fr-FR**.

- Stack : TanStack Start · React 19 · Vite · Tailwind v4 · shadcn/ui · React Query
  · React Hook Form · Zod.
- Persistance : **store JSON sur disque** derrière un adaptateur (`StorageAdapter`),
  un fichier par collection sous `DATA_DIR` (défaut `./data`). Voir
  [Stockage & migration](#stockage--migration-future).
- Auth : comptes **par utilisateur** (email + mot de passe haché scrypt), session
  scellée par cookie httpOnly, **5 rôles** avec permissions par capacité.

---

## Démarrage rapide

```bash
# 1. Installer les dépendances (Bun)
bun install

# 2. Configurer l'environnement
cp .env.example .env.local
#   (en dev, des valeurs par défaut s'appliquent — voir .env.example)

# 3. Charger les données de démonstration (NON destructif — voir plus bas)
bun run seed        # ou: npm run seed

# 4. Lancer en développement
bun run dev         # http://localhost:8080 (le port glisse si occupé)
```

Ouvrez ensuite **`/admin`** et connectez-vous avec l'un des comptes de démo
ci-dessous.

### Scripts utiles

| Script              | Rôle                                      |
| ------------------- | ----------------------------------------- |
| `bun run dev`       | Serveur de développement (Vite + SSR)     |
| `bun run build`     | Build de production (Nitro `node-server`) |
| `bun run seed`      | Insère les données de démo (idempotent)   |
| `bun run typecheck` | `tsc --noEmit`                            |
| `bun run lint`      | ESLint + Prettier                         |
| `bun run test`      | Tests unitaires (Vitest)                  |

---

## Identifiants de démonstration

Le seed crée **un utilisateur par rôle** (mots de passe à changer en production) :

| Rôle                | Email                    | Mot de passe      |
| ------------------- | ------------------------ | ----------------- |
| Super Admin         | `super@sakaneom.tn`      | `SuperAdmin#2026` |
| Directeur / Manager | `directeur@sakaneom.tn`  | `Directeur#2026`  |
| Commercial          | `commercial@sakaneom.tn` | `Commercial#2026` |
| Comptable           | `comptable@sakaneom.tn`  | `Comptable#2026`  |
| Lecture seule       | `lecture@sakaneom.tn`    | `Lecture#2026`    |

> Premier démarrage sans seed ? La **première connexion** avec `ADMIN_EMAIL` /
> `ADMIN_PASSWORD` (cf. `.env.example`) crée automatiquement le Super Admin.

---

## Rôles & permissions

Les permissions sont vérifiées **côté serveur sur chaque fonction** (la vraie
barrière) **et** côté client (masquage / désactivation des actions).

| Rôle                  | Accès                                                             |
| --------------------- | ----------------------------------------------------------------- |
| **Super Admin**       | Tout — paramètres, site web, rendez-vous, demandes web.           |
| **Directeur/Manager** | Rendez-vous + demandes web (écriture) et édition du site web.     |
| **Commercial**        | **Uniquement ses propres** rendez-vous (écriture) + demandes web. |
| **Comptable**         | Consultation seule.                                               |
| **Lecture seule**     | Consultation de tout, aucune modification.                        |

---

## Modules de l'espace admin

| Module              | Description                                                                                                                                                                                                          |
| ------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Tableau de bord** | L'**aperçu du site** (KPI visiteurs / vues / demandes, résidence vedette, liens rapides) suivi des **statistiques** détaillées (visiteurs uniques, taux de conversion, classement des résidences, tendance 7 jours). |
| **Rendez-vous**     | Visites / réunions / signatures en vue **liste + calendrier** ; contact & objet libres, agent assigné, statuts.                                                                                                      |
| **Paramètres**      | Profil de l'agence, devise par défaut, référence des rôles.                                                                                                                                                          |
| **Site web**        | Panneaux CMS du site vitrine : **en-tête & marque**, **résidences**, **contenu & agence**, **demandes web** — réservés au Super Admin / Directeur. Voir [`docs/ADMIN.md`](docs/ADMIN.md).                            |

> Une version précédente intégrait un back-office de promotion complet (projets,
> lots, CRM, ventes, échéanciers, clients, médiathèque, équipe). Ces modules ont
> été retirés (UI + back-end). L'**auth multi-utilisateur** et les **5 rôles**
> sont conservés, ainsi que le module **Rendez-vous** et les **Paramètres**.

---

## Données de démonstration (seed)

`bun run seed` est **non destructif** : chaque collection n'est remplie **que si
elle est vide**, et les 5 utilisateurs ne sont créés que s'ils n'existent pas
(par email). Relancer le script ne supprime **jamais** de données.

Il insère les **5 comptes de rôle**, les **paramètres** de l'agence, quelques
**demandes web** et quelques **rendez-vous**.

---

## Stockage & migration future

Le store JSON (un fichier par collection sous `DATA_DIR`) est volontairement
simple et **suffisant au volume actuel**. Il est **mono-instance** (pas de
verrouillage multi-process — n'exécutez **qu'une seule** instance serveur).

**Chemin de migration** si les volumes/relations le justifient un jour (à ne PAS
faire maintenant) : implémenter un nouvel `StorageAdapter` sur **Cloudflare D1 +
Drizzle** (uploads vers R2). L'interface `StorageAdapter`
(`readBlob`/`writeBlob`/`saveUpload`/`readUpload`) est l'unique couture à
réimplémenter.

---

## Production

Définissez en production (cf. `.env.example`) : `ADMIN_EMAIL`, `ADMIN_PASSWORD`
(≥ 12 car.), `ADMIN_SESSION_SECRET` (≥ 32 car.), et pointez `DATA_DIR` /
`UPLOAD_DIR` vers un répertoire **persistant hors du dossier de déploiement** pour
qu'un redéploiement n'efface pas les données. Détails : [`docs/DEPLOY.md`](docs/DEPLOY.md).

```bash
bun run build && bun run start   # ou: node .output/server/index.mjs
```
