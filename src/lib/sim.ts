import { createHmac, timingSafeEqual } from "crypto";
import type { JWTPayload } from "jose";
import { COMMITTEE_GROUP, IT_ADMIN_ROLE } from "./constants";
import { type ChangeRequest, isPersona, type Persona, PERSONAS, QUORUM, type SimState } from "./simPersonas";

// Plan C (Tide's guidance while its network is under load): simulate TideCloak's sign-in, roles and
// access checks. The server enforces the same rules as the live build; only who vouches for them changes.
export * from "./simPersonas";

export const INITIAL_STATE: SimState = { committee: ["committee1"], requests: [] };

const mac = (user: string, secret: string) => createHmac("sha256", secret).update(user).digest("base64url");

/** Stands in for the token TideCloak would sign: the persona plus an HMAC only the server can make. */
export function signSession(user: Persona, secret: string): string {
  return `${user}.${mac(user, secret)}`;
}

export function verifySession(token: string, secret: string): Persona | null {
  const dot = token.lastIndexOf(".");
  if (dot < 1) return null;
  const user = token.slice(0, dot);
  const given = Buffer.from(token.slice(dot + 1));
  const want = Buffer.from(mac(user, secret));
  if (given.length !== want.length || !timingSafeEqual(given, want)) return null;
  return isPersona(user) ? user : null;
}

/** The claims a live TideCloak token would carry, so every route's checks run unchanged. */
export function identity(user: Persona, state: SimState): JWTPayload {
  return {
    preferred_username: user,
    realm_access: { roles: [...PERSONAS[user].roles] },
    groups: state.committee.includes(user) ? [COMMITTEE_GROUP] : [],
  };
}

const requireAdmin = (who: Persona) => {
  if (!(PERSONAS[who].roles as readonly string[]).includes(IT_ADMIN_ROLE)) throw new Error("Only IT admins can change the committee.");
};

export function propose(
  state: SimState,
  { subject, change, by, id, at }: { subject: Persona; change: "add" | "remove"; by: Persona; id: string; at: string },
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
export function approve(state: SimState, id: string, admin: Persona): SimState {
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
