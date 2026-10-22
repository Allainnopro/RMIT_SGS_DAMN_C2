"use client";

import { IAMService } from "@tidecloak/js";
import { useState } from "react";
import { COMMITTEE_GROUP, INBOX_RECORD, REPORTER_ROLE } from "@/lib/constants";
import { describeRelationshipPolicy, signRelationshipPolicy } from "@/lib/tide/relationship";
import { Icon } from "../icons";
import { Alert, api, Shell } from "../ui";

// P1: reporters may only write into the inbox. P2: committee members may only read it.
const GRANTS = [
  ["inbox-write", { type: "Role", id: REPORTER_ROLE }, "write", "Reporters may write to the inbox"],
  ["inbox-read", { type: "Group", id: COMMITTEE_GROUP }, "read", "The committee may read the inbox"],
] as const;

type Status = "idle" | "waiting" | "done";

// Admins need the network's own words when something fails, so no friendly rewording here.
const raw = (err: unknown) =>
  err instanceof Error ? `${err.message}${err.cause ? ` (${(err.cause as Error).message ?? String(err.cause)})` : ""}` : String(err);

export default function AdminPage() {
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<Record<string, Status>>({});
  const [details, setDetails] = useState<Record<string, string>>({});
  const [error, setError] = useState("");

  async function setup() {
    setBusy(true);
    setStatus({});
    setDetails({});
    setError("");
    try {
      const { realm, vendorId } = IAMService.getConfig() as { realm: string; vendorId: string };
      // Fetched from the browser: the token is DPoP-bound, so only secureFetch can present it.
      const res = await IAMService.secureFetch(`${IAMService.getBaseUrl()}/admin/realms/${realm}/iga/role-policies/name/tide-realm-admin`);
      if (!res.ok) throw new Error(`Could not load the realm admin policy (${res.status}). Sign in as a tide-realm-admin.`);
      const { policy } = (await res.json()) as { policy: string };
      const adminPolicy = Uint8Array.from(atob(policy), (c) => c.charCodeAt(0));

      for (const [name, subject, access] of GRANTS) {
        setStatus((s) => ({ ...s, [name]: "waiting" }));
        const signed = await signRelationshipPolicy({ vendorId, subject, recordId: INBOX_RECORD, access }, adminPolicy);
        const put = await api<{ error?: string }>(`/api/policies/${name}`, { method: "PUT", body: JSON.stringify({ policy: signed }) });
        if (put.status !== 204) throw new Error(put.data.error ?? `Storing ${name} failed (${put.status}).`);
        setStatus((s) => ({ ...s, [name]: "done" }));
        setDetails((d) => ({ ...d, [name]: JSON.stringify(describeRelationshipPolicy(signed), null, 2) }));
      }
    } catch (err) {
      setError(raw(err));
    } finally {
      setBusy(false);
    }
  }

  const allDone = GRANTS.every(([name]) => status[name] === "done");

  return (
    <Shell title="Admin" eyebrow="University IT" intro="Set SafeVoice up once. Every step needs approval in the Tide enclave, so no single admin can change the rules alone.">
      <div className="timeline">
        <section className="card stack rise" style={{ "--i": 1 } as React.CSSProperties} aria-labelledby="setup">
          <div className="card-head" style={{ marginBottom: 0 }}>
            <span className="step-num" aria-hidden="true">1</span>
            <div className="stack" style={{ gap: 4 }}>
              <h2 id="setup">Set up the inbox</h2>
              <p className="muted">Signs two access policies. A Tide enclave window opens for each one: approve it there.</p>
            </div>
          </div>
          <ul className="checklist" aria-live="polite">
            {GRANTS.map(([name, , , label]) => (
              <li key={name}>
                {status[name] === "done" ? <Icon name="check" size={18} /> : status[name] === "waiting" ? <span className="spinner" aria-hidden="true" /> : <Icon name="lock" size={18} />}
                <span>
                  {label} <span className="mono muted">({name})</span>
                  {status[name] === "waiting" && <span className="muted"> · waiting for your approval</span>}
                </span>
              </li>
            ))}
          </ul>
          {error && <Alert kind="error">{error}</Alert>}
          {allDone && <Alert kind="success">Done. Reporters can file and the committee can read.</Alert>}
          <div>
            <button onClick={setup} disabled={busy} className="btn btn-primary magnetic">
              {busy ? <><span className="spinner" aria-hidden="true" />Waiting for approval…</> : <><Icon name="key" size={18} />{allDone ? "Sign the policies again" : "Set up inbox policies"}</>}
            </button>
          </div>
          {Object.keys(details).length > 0 && (
            <details>
              <summary><Icon name="file" size={16} />What was signed</summary>
              {Object.entries(details).map(([name, text]) => <pre key={name} className="code">{text}</pre>)}
            </details>
          )}
        </section>

        <section className="card stack rise" style={{ "--i": 2 } as React.CSSProperties} aria-labelledby="membership">
          <div className="card-head" style={{ marginBottom: 0 }}>
            <span className="step-num" aria-hidden="true">2</span>
            <div className="stack" style={{ gap: 4 }}>
              <h2 id="membership">Committee membership</h2>
              <p className="muted">
                Adding anyone to the committee is a change request that needs a quorum of admins. No single admin, including
                you, can let themselves in.
              </p>
            </div>
          </div>
          <div>
            <a href="http://localhost:8080/admin/safevoice/console/" target="_blank" rel="noreferrer" className="btn btn-ghost">
              Open change requests in TideCloak <Icon name="external" size={16} />
            </a>
          </div>
        </section>
      </div>
    </Shell>
  );
}
