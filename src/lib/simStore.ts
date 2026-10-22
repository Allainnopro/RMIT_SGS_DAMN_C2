import { randomBytes, webcrypto } from "crypto";
import { mkdirSync, readFileSync, renameSync, writeFileSync } from "fs";
import type { JWTPayload } from "jose";
import type { NextRequest } from "next/server";
import { dirname, join } from "path";
import { identity, INITIAL_STATE, type SimState, verifySession } from "./sim";

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

/** The simulated equivalent of verifying a TideCloak token: null unless the session cookie is genuine. */
export async function simIdentity(req: NextRequest): Promise<JWTPayload | null> {
  const token = req.cookies.get(SIM_COOKIE)?.value;
  if (!token) return null;
  const user = verifySession(token, (await network()).secret);
  return user ? identity(user, readSim()) : null;
}
