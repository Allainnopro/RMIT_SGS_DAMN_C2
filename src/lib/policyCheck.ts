import { Models } from "@tideorg/js";
import { INBOX_RECORD, POLICY_SPEC } from "./access";
import type { PolicyName } from "./store";

/**
 * Null when the bytes are a signed, unexpired inbox policy for `name`'s subject under this realm's key;
 * otherwise why not. The SDK cannot verify the signature itself, so this checks everything else.
 */
export function checkPolicy(name: PolicyName, b64: string, vendorId: string): string | null {
  try {
    const p = Models.Policy.from(new Uint8Array(Buffer.from(b64, "base64")));
    const param = (k: string) => String(p.params.entries.get(k) ?? "");
    const spec = POLICY_SPEC[name];
    if (p.contractId !== "RelationshipAttestation:1") return "Not a RelationshipAttestation:1 policy";
    if (!vendorId || p.keyId !== vendorId) return "Policy is for another realm's key";
    if (param("assignmentId") !== INBOX_RECORD) return `Policy is for record "${param("assignmentId")}"`;
    if (p.params.entries.has("clientId")) return "Policy names a client role; the inbox policies never do";
    if (param("subjectType") !== spec.subjectType || param("subjectId") !== spec.subjectId || param("roles") !== spec.roles) {
      return `Policy grants the wrong subject or access for ${name}`;
    }
    if (!p.signature || p.signature.length === 0) return "Policy is not signed";
    if (p.hasExpired()) return "Policy has expired";
    return null;
  } catch (err) {
    return `Not a policy: ${err instanceof Error ? err.message : String(err)}`;
  }
}
