import { mkdtempSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { expect, test } from "vitest";
import { addReport, getPolicy, readStore, setPolicy } from "../src/lib/store";

const tmp = (name: string) => join(mkdtempSync(join(tmpdir(), "sv-")), name);

test("missing store file reads as empty", () => {
  expect(readStore(tmp("none.json"))).toEqual({ reports: [], policies: {} });
});

test("addReport round-trips and leaves no temp file", () => {
  const p = tmp("s.json");
  const r = addReport("CIPHER", p);
  expect(r.ciphertext).toBe("CIPHER");
  expect(readStore(p).reports).toEqual([r]);
  expect(readdirSync(dirname(p))).toEqual(["s.json"]);
});

test("corrupt store throws instead of returning empty", () => {
  const p = tmp("bad.json");
  writeFileSync(p, "{not json");
  expect(() => readStore(p)).toThrow();
  expect(() => addReport("X", p)).toThrow();
  expect(readFileSync(p, "utf8")).toBe("{not json");
});

test("setPolicy then getPolicy", () => {
  const p = tmp("p.json");
  setPolicy("inbox-read", "B64", p);
  expect(getPolicy("inbox-read", p)).toBe("B64");
  expect(getPolicy("inbox-write", p)).toBeNull();
});
