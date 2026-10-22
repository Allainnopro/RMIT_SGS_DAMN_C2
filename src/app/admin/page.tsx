"use client";

import { IAMService } from "@tidecloak/js";
import { useState } from "react";
import { COMMITTEE_GROUP, INBOX_RECORD, REPORTER_ROLE } from "@/lib/constants";
import { describeRelationshipPolicy, signRelationshipPolicy } from "@/lib/tide/relationship";
import { api, Shell, s } from "../ui";

// P1: reporters may only write into the inbox. P2: committee members may only read it.
const GRANTS = [
  ["inbox-write", { type: "Role", id: REPORTER_ROLE }, "write"],
  ["inbox-read", { type: "Group", id: COMMITTEE_GROUP }, "read"],
] as const;

// Admins need the network's own words when something fails, so no friendly rewording here.
const raw = (err: unknown) =>
  err instanceof Error ? `${err.message}${err.cause ? ` (${(err.cause as Error).message ?? String(err.cause)})` : ""}` : String(err);

export default function AdminPage() {
  const [busy, setBusy] = useState(false);
  const [log, setLog] = useState<string[]>([]);
  const [error, setError] = useState("");
  const add = (line: string) => setLog((l) => [...l, line]);

  async function setup() {
    setBusy(true);
    setLog([]);
    setError("");
    try {
      const { realm, vendorId } = IAMService.getConfig() as { realm: string; vendorId: string };
      // Fetched from the browser: the token is DPoP-bound, so only secureFetch can present it.
      const res = await IAMService.secureFetch(`${IAMService.getBaseUrl()}/admin/realms/${realm}/iga/role-policies/name/tide-realm-admin`);
      if (!res.ok) throw new Error(`Could not load the realm admin policy (${res.status}). Sign in as a tide-realm-admin.`);
      const { policy } = (await res.json()) as { policy: string };
      const adminPolicy = Uint8Array.from(atob(policy), (c) => c.charCodeAt(0));

      for (const [name, subject, access] of GRANTS) {
        add(`${name}: approve it in the Tide enclave window…`);
        const signed = await signRelationshipPolicy({ vendorId, subject, recordId: INBOX_RECORD, access }, adminPolicy);
        const put = await api<{ error?: string }>(`/api/policies/${name}`, { method: "PUT", body: JSON.stringify({ policy: signed }) });
        if (put.status !== 204) throw new Error(put.data.error ?? `Storing ${name} failed (${put.status}).`);
        add(`${name}: stored ${JSON.stringify(describeRelationshipPolicy(signed))}`);
      }
      add("Done. Reporters can file and the committee can read.");
    } catch (err) {
      setError(raw(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Shell title="Admin">
      <div style={s.card}>
        <h2 style={{ marginTop: 0 }}>Set up the inbox</h2>
        <p style={s.muted}>
          Signs two policies: reporters may write to the inbox, and the committee group may read it. Each needs your
          approval in the Tide enclave. Done once.
        </p>
        <button onClick={setup} disabled={busy} style={s.btn}>{busy ? "Waiting for approval…" : "Set up inbox policies"}</button>
        {log.length > 0 && <pre style={s.pre}>{log.join("\n")}</pre>}
        {error && <p role="alert" style={s.error}>{error}</p>}
      </div>
      <div style={s.card}>
        <h2 style={{ marginTop: 0 }}>Committee membership</h2>
        <p style={s.muted}>
          Adding anyone to the committee is a change request that needs a quorum of admins in TideCloak. No single admin,
          including you, can let themselves in.
        </p>
        <a href="http://localhost:8080/admin/safevoice/console/" target="_blank" rel="noreferrer" style={s.navLink}>
          Change requests (committee membership needs a quorum)
        </a>
      </div>
    </Shell>
  );
}
