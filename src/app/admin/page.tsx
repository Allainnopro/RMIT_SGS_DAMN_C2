"use client";

import { IAMService } from "@tidecloak/js";
import { useTideCloak } from "@tidecloak/nextjs";
import { useEffect, useState } from "react";
import { COMMITTEE_GROUP, INBOX_RECORD, REPORTER_ROLE } from "@/lib/constants";
import { describeRelationshipPolicy, signRelationshipPolicy } from "@/lib/tide/relationship";
import { Icon } from "../icons";
import { Alert, api, Shell } from "../ui";

// P1: reporters may only write into the inbox. P2: committee members may only read it.
const GRANTS = [
  ["inbox-write", { type: "Role", id: REPORTER_ROLE }, "write", "Reporters may write to the inbox"],
  ["inbox-read", { type: "Group", id: COMMITTEE_GROUP }, "read", "The committee may read the inbox"],
] as const;
type GrantName = (typeof GRANTS)[number][0];
type Status = "idle" | "waiting" | "done";

// Admins need the network's own words when something fails, so no friendly rewording here,
// except for a blocked pop-up, which the admin can fix themselves.
const describe = (err: unknown) => {
  const text = err instanceof Error ? `${err.message}${err.cause ? ` (${(err.cause as Error).message ?? String(err.cause)})` : ""}` : String(err);
  return /opening enclave/i.test(text)
    ? "Your browser blocked the Tide approval window. Allow pop-ups for this site (the icon at the right of the address bar), then click again."
    : text;
};

export default function AdminPage() {
  const { authenticated } = useTideCloak();
  const [prep, setPrep] = useState<{ vendorId: string; adminPolicy: Uint8Array } | null>(null);
  const [prepError, setPrepError] = useState("");
  const [status, setStatus] = useState<Partial<Record<GrantName, Status>>>({});
  const [details, setDetails] = useState<Partial<Record<GrantName, string>>>({});
  const [error, setError] = useState("");

  // Everything the signing needs is fetched up front, so the click opens the enclave pop-up straight away.
  // Browsers block pop-ups that open long after the click (T-27).
  useEffect(() => {
    if (!authenticated) return;
    (async () => {
      try {
        const { realm, vendorId } = IAMService.getConfig() as { realm: string; vendorId: string };
        // Fetched from the browser: the token is DPoP-bound, so only secureFetch can present it.
        const res = await IAMService.secureFetch(`${IAMService.getBaseUrl()}/admin/realms/${realm}/iga/role-policies/name/tide-realm-admin`);
        if (!res.ok) throw new Error(`Could not load the realm admin policy (${res.status}). Sign in as a tide-realm-admin.`);
        const { policy } = (await res.json()) as { policy: string };
        setPrep({ vendorId, adminPolicy: Uint8Array.from(atob(policy), (c) => c.charCodeAt(0)) });
      } catch (err) {
        setPrepError(describe(err));
      }
    })();
  }, [authenticated]);

  async function sign(name: GrantName) {
    const [, subject, access] = GRANTS.find(([n]) => n === name)!;
    if (!prep) return;
    setError("");
    setStatus((s) => ({ ...s, [name]: "waiting" }));
    try {
      const signed = await signRelationshipPolicy({ vendorId: prep.vendorId, subject, recordId: INBOX_RECORD, access }, prep.adminPolicy);
      const put = await api<{ error?: string }>(`/api/policies/${name}`, { method: "PUT", body: JSON.stringify({ policy: signed }) });
      if (put.status !== 204) throw new Error(put.data.error ?? `Storing ${name} failed (${put.status}).`);
      setStatus((s) => ({ ...s, [name]: "done" }));
      setDetails((d) => ({ ...d, [name]: JSON.stringify(describeRelationshipPolicy(signed), null, 2) }));
    } catch (err) {
      setStatus((s) => ({ ...s, [name]: "idle" }));
      setError(describe(err));
    }
  }

  const busy = Object.values(status).includes("waiting");
  const allDone = GRANTS.every(([name]) => status[name] === "done");

  return (
    <Shell title="Admin" eyebrow="University IT" intro="Set SafeVoice up once. Every step needs approval in the Tide enclave, so no single admin can change the rules alone.">
      <div className="timeline">
        <section className="card stack rise" style={{ "--i": 1 } as React.CSSProperties} aria-labelledby="setup">
          <div className="card-head" style={{ marginBottom: 0 }}>
            <span className="step-num" aria-hidden="true">1</span>
            <div className="stack" style={{ gap: 4 }}>
              <h2 id="setup">Set up the inbox</h2>
              <p className="muted">Sign each access policy. A Tide enclave window opens for each one: approve it there.</p>
            </div>
          </div>
          {prepError && <Alert kind="error">{prepError}</Alert>}
          <ul className="checklist" aria-live="polite">
            {GRANTS.map(([name, , , label]) => (
              <li key={name} style={{ alignItems: "center", justifyContent: "space-between", flexWrap: "wrap" }}>
                <span style={{ display: "inline-flex", gap: 12, alignItems: "flex-start" }}>
                  {status[name] === "done" ? <Icon name="check" size={18} /> : status[name] === "waiting" ? <span className="spinner" aria-hidden="true" /> : <Icon name="lock" size={18} />}
                  <span>
                    {label} <span className="mono muted">({name})</span>
                    {status[name] === "waiting" && <span className="muted"> · waiting for your approval</span>}
                  </span>
                </span>
                {status[name] !== "done" && (
                  <button onClick={() => sign(name)} disabled={!prep || busy} className="btn btn-primary btn-sm magnetic">
                    {status[name] === "waiting" ? <><span className="spinner" aria-hidden="true" />Approving…</> : <><Icon name="key" size={16} />{prep ? "Sign" : "Preparing…"}</>}
                  </button>
                )}
              </li>
            ))}
          </ul>
          {error && <Alert kind="error">{error}</Alert>}
          {allDone && <Alert kind="success">Done. Reporters can file and the committee can read.</Alert>}
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
            <a href="http://localhost:8080/realms/safevoice/tide-console/" target="_blank" rel="noreferrer" className="btn btn-ghost">
              Open change requests in TideCloak <Icon name="external" size={16} />
            </a>
          </div>
        </section>
      </div>
    </Shell>
  );
}
