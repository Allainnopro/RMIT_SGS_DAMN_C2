import { Models } from "@tideorg/js";
import { INBOX_RECORD, POLICY_SPEC } from "./access";
import type { PolicyName } from "./store";

/** Null when the bytes are a signed inbox policy for `name`'s subject; otherwise why not. */
export function checkPolicy(name: PolicyName, b64: string): string | null {
  try {
    const p = Models.Policy.from(new Uint8Array(Buffer.from(b64, "base64")));
    const param = (k: string) => String(p.params.entries.get(k) ?? "");
    const spec = POLICY_SPEC[name];
    if (p.contractId !== "RelationshipAttestation:1") return "Not a RelationshipAttestation:1 policy";
    if (param("assignmentId") !== INBOX_RECORD) return `Policy is for record "${param("assignmentId")}"`;
    if (param("subjectType") !== spec.subjectType || param("subjectId") !== spec.subjectId || param("roles") !== spec.roles) {
      return `Policy grants the wrong subject or access for ${name}`;
    }
    if (!p.signature || p.signature.length === 0) return "Policy is not signed";
    return null;
  } catch (err) {
    return `Not a policy: ${err instanceof Error ? err.message : String(err)}`;
  }
}
