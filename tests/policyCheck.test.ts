import { Models } from "@tideorg/js";
import { expect, test } from "vitest";
import { checkPolicy } from "../src/lib/policyCheck";

const VENDOR = "vendor-123";
const READ_PARAMS: [string, string][] = [
  ["subjectType", "Group"],
  ["subjectId", "/committee"],
  ["assignmentId", "safevoice-inbox"],
  ["roles", '["_tide_decryptor"]'],
];

// Real policy bytes, built the way relationship.ts builds them. The signature is a stand-in:
// the server can only check that one is present (the SDK has no verify).
function policyB64({ keyId = VENDOR, expiry, params = READ_PARAMS, signed = true }: { keyId?: string; expiry?: number; params?: [string, string][]; signed?: boolean } = {}) {
  const p = new Models.Policy({
    version: (Models.Policy as unknown as { latestVersion: string }).latestVersion,
    contractId: "RelationshipAttestation:1",
    modelId: ["PolicyEnabledEncryption:1", "PolicyEnabledDecryption:1"],
    keyId,
    approvalType: Models.ApprovalType.IMPLICIT,
    executionType: Models.ExecutionType.PRIVATE,
    params: new Map(params),
    ...(expiry !== undefined ? { expiry } : {}),
  });
  if (signed) p.signature = new Uint8Array(64).fill(7);
  return Buffer.from(p.toBytes()).toString("base64");
}

test.each(["", "not-base64!!", "AAAA"])("checkPolicy rejects junk %s", (b64) => {
  expect(checkPolicy("inbox-read", b64, VENDOR)).not.toBeNull();
});

test("a signed committee policy for our realm passes", () => {
  expect(checkPolicy("inbox-read", policyB64(), VENDOR)).toBeNull();
});

test("the committee policy cannot be stored as the reporter policy", () => {
  expect(checkPolicy("inbox-write", policyB64(), VENDOR)).not.toBeNull();
});

test("an unsigned policy is rejected", () => {
  expect(checkPolicy("inbox-read", policyB64({ signed: false }), VENDOR)).toMatch(/not signed/i);
});

test("an expired policy is rejected", () => {
  expect(checkPolicy("inbox-read", policyB64({ expiry: 1 }), VENDOR)).toMatch(/expired/i);
});

test("a policy for another realm key is rejected", () => {
  expect(checkPolicy("inbox-read", policyB64({ keyId: "someone-else" }), VENDOR)).toMatch(/realm/i);
});

test("a policy with an extra clientId is rejected", () => {
  expect(checkPolicy("inbox-read", policyB64({ params: [...READ_PARAMS, ["clientId", "x"]] }), VENDOR)).not.toBeNull();
});
