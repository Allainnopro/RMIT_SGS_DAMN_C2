import { createHash, randomBytes, timingSafeEqual, webcrypto } from "crypto";
import { mkdirSync, readFileSync, renameSync, writeFileSync } from "fs";
import type { JWTPayload } from "jose";
import type { NextRequest } from "next/server";
import { dirname, join } from "path";
import {
  checkPassword, hashPassword, identity, INITIAL_STATE, isPersona, type PasswordRecord, PERSONAS, signSession, type SimState, verifySession,
} from "./sim";

// Plan C state, kept beside the report store. shortcut: same single-file read-modify-write as store.ts.
export const SIM_COOKIE = "safevoice_sim";
const file = (name: string) => join(process.cwd(), "data", name);

function readJson<T>(path: string, fallback: T): T {
  try {
    return JSON.parse(readFileSync(path, "utf-8")) as T;
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") return fallback;
    throw err; // corrupt: never silently reset approvals or keys
  }
}
function writeJson(path: string, value: unknown): void {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(`${path}.tmp`, JSON.stringify(value, null, 2));
  renameSync(`${path}.tmp`, path);
}

export const readSim = (): SimState => readJson(file("sim.json"), INITIAL_STATE);
export const writeSim = (s: SimState) => writeJson(file("sim.json"), s);

interface Network {
  secret: string;
  publicJwk: webcrypto.JsonWebKey;
  privateJwk: webcrypto.JsonWebKey;
}

/**
 * The simulated Tide network: it signs sessions and holds the key that unwraps report keys.
 * Live Tide splits this key across 20 independent nodes so no one holds it; the simulation keeps it
 * in one file, apart from the report store, and releases it only through the same membership check.
 */
export async function network(): Promise<Network> {
  const path = file("sim-network.json");
  const existing = readJson<Network | null>(path, null);
  if (existing) return existing;
  const pair = await webcrypto.subtle.generateKey(
    { name: "RSA-OAEP", modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: "SHA-256" },
    true,
    ["encrypt", "decrypt"],
  );
  const created: Network = {
    secret: randomBytes(32).toString("base64url"),
    publicJwk: await webcrypto.subtle.exportKey("jwk", pair.publicKey),
    privateJwk: await webcrypto.subtle.exportKey("jwk", pair.privateKey),
  };
  writeJson(path, created);
  return created;
}

interface Accounts {
  users: Record<string, PasswordRecord & { createdAt: string }>;
}
const ACCOUNTS = () => file("sim-accounts.json");
const readAccounts = (): Accounts => readJson(ACCOUNTS(), { users: {} });

export const accountExists = (u: string) => isPersona(u) || Object.hasOwn(readAccounts().users, u);
export const allAccounts = () => [...Object.keys(PERSONAS), ...Object.keys(readAccounts().users)];

/**
 * The seeded university accounts sign in with SIM_DEMO_PASSWORD from the environment (never stored);
 * created accounts with their own password, checked against its salted hash.
 * shortcut: no rate limit on attempts; add one before this faces real users.
 */
export function authenticate(username: string, password: string): boolean {
  if (isPersona(username)) {
    const demo = process.env.SIM_DEMO_PASSWORD;
    if (!demo) throw new Error("Set SIM_DEMO_PASSWORD in .env.local to use the demo accounts.");
    const digest = (s: string) => createHash("sha256").update(s).digest();
    return timingSafeEqual(digest(password), digest(demo));
  }
  const rec = readAccounts().users[username];
  return !!rec && checkPassword(password, rec);
}

/** A new account is always a reporter. Only a quorum of IT admins can put it on the committee. */
export function register(username: string, password: string): void {
  const accounts = readAccounts();
  if (isPersona(username) || Object.hasOwn(accounts.users, username)) throw new Error("That username is taken.");
  accounts.users[username] = { ...hashPassword(password), createdAt: new Date().toISOString() };
  writeJson(ACCOUNTS(), accounts);
}

/** The Set-Cookie value for a signed-in session. Secure whenever the browser reached us over https. */
export async function sessionCookie(user: string, req: NextRequest): Promise<string> {
  const secure = req.headers.get("x-forwarded-proto") === "https" || req.nextUrl.protocol === "https:";
  return `${SIM_COOKIE}=${signSession(user, (await network()).secret)}; Path=/; HttpOnly; SameSite=Lax${secure ? "; Secure" : ""}`;
}

/** The simulated equivalent of verifying a TideCloak token: null unless the cookie is genuine and the account exists. */
export async function simIdentity(req: NextRequest): Promise<JWTPayload | null> {
  const token = req.cookies.get(SIM_COOKIE)?.value;
  if (!token) return null;
  const user = verifySession(token, (await network()).secret);
  return user && accountExists(user) ? identity(user, readSim()) : null;
}
