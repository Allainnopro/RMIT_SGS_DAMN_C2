import { createHmac, randomBytes, scryptSync, timingSafeEqual } from "crypto";
import type { JWTPayload } from "jose";
import { COMMITTEE_GROUP, IT_ADMIN_ROLE, REPORTER_ROLE } from "./constants";
import { type ChangeRequest, isPersona, PERSONAS, QUORUM, type SimState } from "./simPersonas";

// Plan C (Tide's guidance while its network is under load): simulate TideCloak's sign-in, roles and
// access checks. The server enforces the same rules as the live build; only who vouches for them changes.
export * from "./simPersonas";

export const INITIAL_STATE: SimState = { committee: ["committee1"], requests: [] };

const mac = (user: string, secret: string) => createHmac("sha256", secret).update(user).digest("base64url");

/** Lowercase letters, digits and . _ - only, so a username is never markup or a path. */
export const validUsername = (u: unknown): u is string => typeof u === "string" && /^[a-z0-9][a-z0-9._-]{2,31}$/.test(u);

export interface PasswordRecord {
  salt: string;
  hash: string;
}

/** Salted scrypt: the account file never holds a password, only what it hashes to. */
export function hashPassword(password: string): PasswordRecord {
  const salt = randomBytes(16).toString("base64");
  return { salt, hash: scryptSync(password, salt, 64).toString("base64") };
}

export function checkPassword(password: string, rec: PasswordRecord): boolean {
  const want = Buffer.from(rec.hash, "base64");
  const got = scryptSync(password, rec.salt, 64);
  return got.length === want.length && timingSafeEqual(got, want);
}

/** Stands in for the token TideCloak would sign: the username plus an HMAC only the server can make. */
export function signSession(user: string, secret: string): string {
  return `${user}.${mac(user, secret)}`;
}

// Whether the account still exists is checked by the caller, against the account store.
export function verifySession(token: string, secret: string): string | null {
  const dot = token.lastIndexOf(".");
  if (dot < 1) return null;
  const user = token.slice(0, dot);
  const given = Buffer.from(token.slice(dot + 1));
  const want = Buffer.from(mac(user, secret));
  if (given.length !== want.length || !timingSafeEqual(given, want)) return null;
  return validUsername(user) ? user : null;
}

/** The claims a live TideCloak token would carry, so every route's checks run unchanged. */
export function identity(user: string, state: SimState): JWTPayload {
  return {
    preferred_username: user,
    realm_access: { roles: isPersona(user) ? [...PERSONAS[user].roles] : [REPORTER_ROLE] },
    groups: state.committee.includes(user) ? [COMMITTEE_GROUP] : [],
  };
}

// Admins are only ever the seeded university IT accounts: creating an account can never make one.
const requireAdmin = (who: string) => {
  if (!isPersona(who) || !(PERSONAS[who].roles as readonly string[]).includes(IT_ADMIN_ROLE)) {
    throw new Error("Only IT admins can change the committee.");
  }
};

export function propose(
  state: SimState,
  { subject, change, by, id, at }: { subject: string; change: "add" | "remove"; by: string; id: string; at: string },
): SimState {
  requireAdmin(by);
  const member = state.committee.includes(subject);
  if (change === "add" && member) throw new Error(`${subject} is already on the committee.`);
  if (change === "remove" && !member) throw new Error(`${subject} is not on the committee.`);
  if (state.requests.some((r) => r.status === "pending" && r.subject === subject)) {
    throw new Error(`A change for ${subject} is already pending.`);
  }
  const request: ChangeRequest = { id, subject, change, requestedBy: by, approvals: [], status: "pending", createdAt: at };
  return { ...state, requests: [...state.requests, request] };
}

/** One admin's approval. The change applies only when QUORUM different admins have approved it. */
export function approve(state: SimState, id: string, admin: string): SimState {
  requireAdmin(admin);
  const r = state.requests.find((x) => x.id === id);
  if (!r || r.status !== "pending") throw new Error("That change request is not pending.");
  if (r.approvals.includes(admin)) throw new Error(`${admin} already approved this change.`);
  const approvals = [...r.approvals, admin];
  const applied = approvals.length >= QUORUM;
  const committee = !applied
    ? state.committee
    : r.change === "add" ? [...state.committee, r.subject] : state.committee.filter((m) => m !== r.subject);
  return {
    committee,
    requests: state.requests.map((x) => (x.id === id ? { ...x, approvals, status: applied ? "applied" : "pending" } : x)),
  };
}
