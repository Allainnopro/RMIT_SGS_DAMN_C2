import { expect, test } from "vitest";
import { describeTideError } from "../src/lib/tideErrors";

test.each([
  "TIDE-TIDEJS-NET-THRESHOLD_FAILURE: Could not reach enough VVK ORKs (got 0 of 5 required)",
  "'/committee' group not found in doken.",
  "_tide_decryptor not found in list of roles.",
  "subjectId does not match. a <> b",
])("refusal %s reads as no access", (m) => {
  expect(describeTideError(new Error(m))).toBe("You don't have access to these reports.");
});

test("a refusal carried in err.cause also reads as no access", () => {
  const err = new Error("request failed", { cause: new Error("Tags do not contain assignmentId.") });
  expect(describeTideError(err)).toBe("You don't have access to these reports.");
});

test("a node outage reads as a network problem, not as no access", () => {
  const ork3 =
    "TideError[TIDE-TIDEJS-NET-THRESHOLD_FAILURE]: Could not reach enough VVK ORKs (got 19 of 20 required, 1 of 20 failed) source: Tools/Utils.ts:PromiseRace details: 1 underlying failure(s): - https://ork3.tideprotocol.com/Authentication/Key/v1/PreSign?vuid=b1f7 [TIDE-TIDEJS-NET-FETCH_FAILED] Network request failed cause: TideError: Network request failed";
  expect(describeTideError(new Error(ork3))).toBe("Tide's network didn't answer just now. Please try again in a minute.");
});

test("anything else is shown as-is", () => {
  expect(describeTideError(new Error("boom"))).toBe("boom");
  expect(describeTideError("plain string")).toBe("plain string");
});
