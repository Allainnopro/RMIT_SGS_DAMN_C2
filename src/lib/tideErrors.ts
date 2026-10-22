export const NO_ACCESS = "You don't have access to these reports.";

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
  if (REFUSALS.some((r) => all.includes(r))) return NO_ACCESS;
  return textOf(err) || String(err);
}
