import { expect, test } from "vitest";
import { checkPolicy } from "../src/lib/policyCheck";

test.each(["", "not-base64!!", "AAAA"])("checkPolicy rejects junk %s", (b64) => {
  expect(checkPolicy("inbox-read", b64)).not.toBeNull();
});
