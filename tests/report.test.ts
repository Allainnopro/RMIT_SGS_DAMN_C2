import { expect, test } from "vitest";
import { parseReport } from "../src/lib/report";

test("a well-formed report parses", () => {
  const r = { category: "Harassment", description: "Chuyện xảy ra ở phòng lab", when: "Tuesday", contact: { name: "An", contact: "an@example.org" } };
  expect(parseReport(JSON.stringify(r))).toEqual(r);
});

test.each([
  ["not JSON", "{nope"],
  ["an object category", JSON.stringify({ category: {}, description: "x" })],
  ["a missing description", JSON.stringify({ category: "Other" })],
  ["a non-string place", JSON.stringify({ category: "Other", description: "x", where: 4 })],
  ["a non-string contact name", JSON.stringify({ category: "Other", description: "x", contact: { name: 1 } })],
  ["a null body", "null"],
])("a report with %s is refused instead of crashing the inbox", (_, json) => {
  expect(() => parseReport(json)).toThrow(/damaged/);
});
