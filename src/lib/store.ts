import { randomUUID } from "crypto";
import { mkdirSync, readFileSync, renameSync, writeFileSync } from "fs";
import { dirname, join } from "path";

// The server stores ciphertext and signed policies only. It never sees a report's plaintext.
// shortcut: one JSON file, read-modify-write per request; two writes at the same instant can lose
// one. Fine for a single-machine demo; use a database before more than one person files at once.

export type PolicyName = "inbox-write" | "inbox-read";

export interface ReportRecord {
  id: string;
  createdAt: string;
  ciphertext: string;
}

export interface Store {
  reports: ReportRecord[];
  policies: Partial<Record<PolicyName, string>>;
}

const defaultPath = () => process.env.SAFEVOICE_STORE ?? join(process.cwd(), "data", "store.json");

export function readStore(path = defaultPath()): Store {
  let text: string;
  try {
    text = readFileSync(path, "utf-8");
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") return { reports: [], policies: {} };
    throw err;
  }
  // A corrupt file throws here. Reading it as empty would let the next write erase every report.
  return JSON.parse(text) as Store;
}

function writeStore(store: Store, path: string): void {
  mkdirSync(dirname(path), { recursive: true });
  const tmp = `${path}.tmp`;
  writeFileSync(tmp, JSON.stringify(store, null, 2));
  renameSync(tmp, path); // swap in whole: a crash mid-write leaves the previous file intact
}

export function addReport(ciphertext: string, path = defaultPath()): ReportRecord {
  const store = readStore(path);
  const record: ReportRecord = { id: randomUUID(), createdAt: new Date().toISOString(), ciphertext };
  store.reports.push(record);
  writeStore(store, path);
  return record;
}

export function setPolicy(name: PolicyName, b64: string, path = defaultPath()): void {
  const store = readStore(path);
  store.policies[name] = b64;
  writeStore(store, path);
}

export function getPolicy(name: PolicyName, path = defaultPath()): string | null {
  return readStore(path).policies[name] ?? null;
}
