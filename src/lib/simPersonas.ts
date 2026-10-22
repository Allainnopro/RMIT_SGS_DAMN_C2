import { IT_ADMIN_ROLE, REPORTER_ROLE } from "./constants";

// Client-safe half of the Plan C simulation (no Node imports), shared by pages and server.
export const SIMULATED = process.env.NEXT_PUBLIC_TIDE_MODE === "simulated";

export const PERSONAS = {
  reporter1: { label: "Reporter", roles: [REPORTER_ROLE] },
  committee1: { label: "Committee member", roles: [] },
  admin1: { label: "IT admin 1", roles: [IT_ADMIN_ROLE] },
  admin2: { label: "IT admin 2", roles: [IT_ADMIN_ROLE] },
  admin3: { label: "IT admin 3", roles: [IT_ADMIN_ROLE] },
} as const;
export type Persona = keyof typeof PERSONAS;
export const isPersona = (u: unknown): u is Persona => typeof u === "string" && Object.hasOwn(PERSONAS, u);

/** Distinct IT admins who must approve a committee change: TideCloak's threshold of 0.7 × 3 admins. */
export const QUORUM = 2;
export const MIN_PASSWORD_LENGTH = 8;

// Accounts are the seeded personas above plus anyone who creates one (always a reporter).
export interface ChangeRequest {
  id: string;
  subject: string;
  change: "add" | "remove";
  requestedBy: string;
  approvals: string[];
  status: "pending" | "applied";
  createdAt: string;
}
export interface SimState {
  committee: string[];
  requests: ChangeRequest[];
}
