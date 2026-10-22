// What a decrypted report must look like. Any reporter can encrypt anything into the inbox,
// so the committee page checks the shape instead of trusting it.
export interface Report {
  category: string;
  description: string;
  when?: string;
  where?: string;
  contact?: { name?: string; contact?: string };
}

const DAMAGED = "This report is damaged and can't be shown.";
const optionalString = (v: unknown) => v === undefined || typeof v === "string";

export function parseReport(json: string): Report {
  let r: unknown;
  try {
    r = JSON.parse(json);
  } catch {
    throw new Error(DAMAGED);
  }
  const o = r as Record<string, unknown> | null;
  const c = o?.contact as Record<string, unknown> | null | undefined;
  const ok =
    typeof o === "object" && o !== null &&
    typeof o.category === "string" && typeof o.description === "string" &&
    optionalString(o.when) && optionalString(o.where) &&
    (c === undefined || (typeof c === "object" && c !== null && optionalString(c.name) && optionalString(c.contact)));
  if (!ok) throw new Error(DAMAGED);
  return o as unknown as Report;
}
