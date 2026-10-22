import type { JWTPayload } from "jose";
import { hasRole } from "./auth/tideJWT";
import { COMMITTEE_GROUP, MAX_CIPHERTEXT, REPORTER_ROLE } from "./constants";
import type { PolicyName } from "./store";

export { COMMITTEE_GROUP, INBOX_RECORD, IT_ADMIN_ROLE, MAX_CIPHERTEXT, REPORTER_ROLE } from "./constants";

// What each signed policy must say. `roles` is JSON written as a string, as relationship.ts signs it.
export const POLICY_SPEC: Record<PolicyName, { subjectType: "Role" | "Group"; subjectId: string; roles: string }> = {
  "inbox-write": { subjectType: "Role", subjectId: REPORTER_ROLE, roles: '["_tide_encryptor"]' },
  "inbox-read": { subjectType: "Group", subjectId: COMMITTEE_GROUP, roles: '["_tide_decryptor"]' },
};

export function isPolicyName(name: string): name is PolicyName {
  return Object.hasOwn(POLICY_SPEC, name);
}

/** The `groups` claim carries full paths; only an exact match counts. */
export function inGroup(jwt: JWTPayload, path: string): boolean {
  return Array.isArray(jwt.groups) && (jwt.groups as unknown[]).includes(path);
}

/** A signed policy goes only to the subject it names. */
export function mayReadPolicy(jwt: JWTPayload, name: PolicyName): boolean {
  return name === "inbox-write" ? hasRole(jwt, REPORTER_ROLE) : inGroup(jwt, COMMITTEE_GROUP);
}

export function parseReportBody(body: unknown): { ciphertext: string } | { error: string } {
  const ciphertext = (body as { ciphertext?: unknown } | null)?.ciphertext;
  if (typeof ciphertext !== "string" || ciphertext.length === 0) return { error: "Missing ciphertext" };
  if (ciphertext.length > MAX_CIPHERTEXT) return { error: "Report too large" };
  return { ciphertext };
}
