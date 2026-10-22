import { INBOX_RECORD } from "@/lib/constants";
import { SIMULATED } from "@/lib/simPersonas";
import { decryptForRecord, encryptForRecord } from "@/lib/tide/relationship";
import { NO_ACCESS } from "@/lib/tideErrors";
import { api } from "./ui";

// Sealing and opening reports, in the browser. Live: Tide's network enforces the signed inbox policies.
// Plan C: a simulated network enforces the same rule (reporters seal, committee members open).
const NOT_SET_UP = "SafeVoice isn't set up yet: an admin must approve the inbox policies.";
const NOT_REPORTER = "Your account can't file reports yet: it needs the reporter role.";
const DAMAGED = "This report is damaged and can't be shown.";

const b64 = (bytes: ArrayBuffer | Uint8Array) => {
  let s = "";
  for (const b of new Uint8Array(bytes)) s += String.fromCharCode(b); // no spread: reports can be 40 KB
  return btoa(s);
};
const unb64 = (s: string) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));

export async function sealer(): Promise<(json: string) => Promise<string>> {
  if (SIMULATED) {
    const k = await api<{ publicJwk?: JsonWebKey }>("/api/sim/network");
    if (k.status === 403) throw new Error(NOT_REPORTER);
    if (k.status !== 200 || !k.data.publicJwk) throw new Error(`Could not reach the network (${k.status}).`);
    const pub = await crypto.subtle.importKey("jwk", k.data.publicJwk, { name: "RSA-OAEP", hash: "SHA-256" }, false, ["encrypt"]);
    return async (json) => {
      // A fresh key per report, wrapped so only the network can unwrap it, and only for the committee.
      const key = await crypto.subtle.generateKey({ name: "AES-GCM", length: 256 }, true, ["encrypt"]);
      const iv = crypto.getRandomValues(new Uint8Array(12));
      const ct = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, new TextEncoder().encode(json));
      const wrapped = await crypto.subtle.encrypt({ name: "RSA-OAEP" }, pub, await crypto.subtle.exportKey("raw", key));
      return btoa(JSON.stringify({ v: "sim-1", k: b64(wrapped), iv: b64(iv), ct: b64(ct) }));
    };
  }
  const p = await api<{ policy?: string; error?: string }>("/api/policies/inbox-write");
  if (p.status === 404) throw new Error(NOT_SET_UP);
  if (p.status === 403) throw new Error(NOT_REPORTER);
  if (p.status !== 200 || !p.data.policy) throw new Error(p.data.error ?? `Could not load the inbox policy (${p.status}).`);
  const policy = p.data.policy;
  return (json) => encryptForRecord(json, INBOX_RECORD, policy);
}

export async function opener(): Promise<(ciphertext: string) => Promise<string>> {
  if (SIMULATED) {
    return async (ciphertext) => {
      let env: { k: string; iv: string; ct: string };
      try {
        env = JSON.parse(atob(ciphertext));
      } catch {
        throw new Error(DAMAGED);
      }
      const r = await api<{ key?: string; error?: string }>("/api/sim/network", { method: "POST", body: JSON.stringify({ k: env.k }) });
      if (r.status === 403) throw new Error(NO_ACCESS);
      if (r.status !== 200 || !r.data.key) throw new Error(r.data.error ?? DAMAGED);
      const key = await crypto.subtle.importKey("raw", unb64(r.data.key), "AES-GCM", false, ["decrypt"]);
      try {
        return new TextDecoder().decode(await crypto.subtle.decrypt({ name: "AES-GCM", iv: unb64(env.iv) }, key, unb64(env.ct)));
      } catch {
        throw new Error(DAMAGED);
      }
    };
  }
  const p = await api<{ policy?: string; error?: string }>("/api/policies/inbox-read");
  if (p.status === 404) throw new Error(NOT_SET_UP);
  if (p.status !== 200 || !p.data.policy) throw new Error(p.data.error ?? `Could not load the committee policy (${p.status}).`);
  const policy = p.data.policy;
  return (ciphertext) => decryptForRecord(ciphertext, INBOX_RECORD, policy);
}
