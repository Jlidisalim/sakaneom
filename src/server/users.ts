// ────────────────────────────────────────────────────────────────────────────
// User accounts for the back-office (Équipe). A user is also an "agent" when
// commercial. Persisted as the `users` JSON blob behind the StorageAdapter, with
// passwords hashed via scrypt (node:crypto, lazily imported to stay out of any
// client bundle — same convention as storage.ts). `passwordHash` NEVER leaves the
// server: every exported read returns a PublicUser with credentials stripped.
//
// This extends — does NOT replace — the existing sealed-cookie session auth in
// auth.ts: auth.ts calls verifyLogin() here, then stores { userId, role } in the
// same TanStack session cookie.
// ────────────────────────────────────────────────────────────────────────────
import type { PublicUser, User } from "@/lib/promo/types";
import type { Role } from "@/lib/promo/permissions";
import { getStorage } from "./storage";
import { serialize } from "./store";

// ── Password hashing (scrypt) ─────────────────────────────────────────────────

const SCRYPT_KEYLEN = 64;

/** Hash a plaintext password → `scrypt$<salt>$<hash>` (safe to persist). */
export async function hashPassword(password: string): Promise<string> {
  const { randomBytes, scrypt } = await import("node:crypto");
  const salt = randomBytes(16).toString("hex");
  const derived = await new Promise<Buffer>((resolve, reject) => {
    scrypt(password, salt, SCRYPT_KEYLEN, (err, dk) => (err ? reject(err) : resolve(dk as Buffer)));
  });
  return `scrypt$${salt}$${derived.toString("hex")}`;
}

/** Constant-time verify a plaintext password against a stored hash. */
export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const parts = stored.split("$");
  if (parts.length !== 3 || parts[0] !== "scrypt") return false;
  const [, salt, hashHex] = parts;
  const { scrypt, timingSafeEqual } = await import("node:crypto");
  const expected = Buffer.from(hashHex, "hex");
  const actual = await new Promise<Buffer>((resolve, reject) => {
    scrypt(password, salt, expected.length, (err, dk) =>
      err ? reject(err) : resolve(dk as Buffer),
    );
  });
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

// ── Storage ───────────────────────────────────────────────────────────────────

async function readUsers(): Promise<User[]> {
  const v = await getStorage().readBlob<User[]>("users", []);
  return Array.isArray(v) ? v : [];
}

function toPublic(u: User): PublicUser {
  const { passwordHash: _omit, ...rest } = u;
  return rest;
}

export async function listUsers(): Promise<PublicUser[]> {
  return (await readUsers()).map(toPublic);
}

export async function getUser(id: string): Promise<PublicUser | null> {
  const u = (await readUsers()).find((x) => x.id === id);
  return u ? toPublic(u) : null;
}

export async function getUserByEmail(email: string): Promise<User | null> {
  const e = email.trim().toLowerCase();
  return (await readUsers()).find((u) => u.email.trim().toLowerCase() === e) ?? null;
}

export type UserInput = {
  nom: string;
  email: string;
  phone?: string;
  photo?: string;
  role: Role;
  active?: boolean;
  password?: string;
};

export async function addUser(input: UserInput): Promise<PublicUser> {
  const passwordHash = input.password ? await hashPassword(input.password) : "";
  return serialize(async () => {
    const users = await readUsers();
    const email = input.email.trim();
    if (users.some((u) => u.email.trim().toLowerCase() === email.toLowerCase())) {
      throw new Error("Un utilisateur avec cet email existe déjà");
    }
    const user: User = {
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
      nom: input.nom.trim(),
      email,
      phone: input.phone ?? "",
      photo: input.photo ?? "",
      role: input.role,
      active: input.active ?? true,
      passwordHash,
    };
    users.unshift(user);
    await getStorage().writeBlob("users", users);
    return toPublic(user);
  });
}

export async function updateUser(
  id: string,
  patch: Partial<UserInput>,
): Promise<PublicUser | null> {
  // Hash a new password (if supplied) outside the write-chain so scrypt doesn't
  // block other writes.
  const passwordHash = patch.password ? await hashPassword(patch.password) : undefined;
  return serialize(async () => {
    const users = await readUsers();
    const idx = users.findIndex((u) => u.id === id);
    if (idx === -1) return null;
    const { password: _pw, email, ...rest } = patch;
    if (email && email.trim().toLowerCase() !== users[idx].email.trim().toLowerCase()) {
      const taken = users.some(
        (u) => u.id !== id && u.email.trim().toLowerCase() === email.trim().toLowerCase(),
      );
      if (taken) throw new Error("Un utilisateur avec cet email existe déjà");
    }
    users[idx] = {
      ...users[idx],
      ...rest,
      ...(email ? { email: email.trim() } : {}),
      ...(passwordHash ? { passwordHash } : {}),
    };
    await getStorage().writeBlob("users", users);
    return toPublic(users[idx]);
  });
}

export async function deleteUser(id: string): Promise<boolean> {
  return serialize(async () => {
    const users = await readUsers();
    const target = users.find((u) => u.id === id);
    if (!target) return false;
    // Never remove the last active Super Admin — that would lock everyone out.
    if (target.role === "super_admin") {
      const otherSupers = users.filter((u) => u.id !== id && u.role === "super_admin" && u.active);
      if (otherSupers.length === 0) {
        throw new Error("Impossible de supprimer le dernier Super Admin");
      }
    }
    const next = users.filter((u) => u.id !== id);
    await getStorage().writeBlob("users", next);
    return true;
  });
}

/** Verify credentials. Returns the FULL user (with role) on success, else null. */
export async function verifyLogin(email: string, password: string): Promise<User | null> {
  const user = await getUserByEmail(email);
  if (!user || !user.active || !user.passwordHash) return null;
  const ok = await verifyPassword(password, user.passwordHash);
  return ok ? user : null;
}

/** True when no users exist yet (fresh install → seed/bootstrap needed). */
export async function hasNoUsers(): Promise<boolean> {
  return (await readUsers()).length === 0;
}
