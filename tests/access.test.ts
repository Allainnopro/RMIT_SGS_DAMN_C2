import { expect, test } from "vitest";
import { inGroup, mayReadPolicy, parseReportBody } from "../src/lib/access";

test("committee check needs the exact full path", () => {
  expect(inGroup({ groups: ["/committee"] }, "/committee")).toBe(true);
  expect(inGroup({ groups: ["committee"] }, "/committee")).toBe(false);
  expect(inGroup({}, "/committee")).toBe(false);
});

test("each policy goes only to the subject it names", () => {
  const reporter = { realm_access: { roles: ["reporter"] } };
  const member = { groups: ["/committee"], realm_access: { roles: [] } };
  expect(mayReadPolicy(reporter, "inbox-write")).toBe(true);
  expect(mayReadPolicy(reporter, "inbox-read")).toBe(false);
  expect(mayReadPolicy(member, "inbox-read")).toBe(true);
  expect(mayReadPolicy(member, "inbox-write")).toBe(false);
});

test.each([[{}], [{ ciphertext: "" }], [{ ciphertext: 42 }], [{ ciphertext: "x".repeat(1_000_001) }], [null]])(
  "parseReportBody rejects %o",
  (b) => expect(parseReportBody(b)).toHaveProperty("error"),
);

test("parseReportBody accepts a ciphertext", () => {
  expect(parseReportBody({ ciphertext: "abc" })).toEqual({ ciphertext: "abc" });
});
