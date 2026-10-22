export const NO_ACCESS = "You don't have access to these reports.";
export const NETWORK_DOWN = "Tide's network didn't answer just now. Please try again in a minute.";

// A node that could not be reached is an outage, not a refusal: the refusing nodes answer with the
// contract's message instead. Checked first, because an outage is also reported as THRESHOLD_FAILURE.
const OUTAGES = ["FETCH_FAILED", "Network request failed", "upstream connect error"];

// The Tide network reports a contract refusal as a THRESHOLD_FAILURE: every ORK answered "no".
// Retrying cannot succeed, so it is shown as a plain no-access message (AP-RA18).
const REFUSALS = [
  "THRESHOLD_FAILURE",
  "not found in doken",
  "not found in list of roles",
  "subjectId does not match",
  "Tags do not contain assignmentId",
];

const textOf = (e: unknown): string =>
  e instanceof Error ? e.message : typeof e === "string" ? e : String((e as { message?: unknown })?.message ?? "");

export function describeTideError(err: unknown): string {
  const all = `${textOf(err)} ${textOf((err as { cause?: unknown } | null)?.cause)}`;
  if (OUTAGES.some((o) => all.includes(o))) return NETWORK_DOWN;
  if (REFUSALS.some((r) => all.includes(r))) return NO_ACCESS;
  return textOf(err) || String(err);
}
