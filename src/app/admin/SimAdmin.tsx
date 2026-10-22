"use client";

import { useCallback, useEffect, useState } from "react";
import { isPersona, PERSONAS, QUORUM, type SimState } from "@/lib/simPersonas";
import { useAuth } from "../auth";
import { Icon } from "../icons";
import { Alert, api, Shell } from "../ui";

type View = SimState & { accounts?: string[] };
const name = (u: string) => (isPersona(u) ? `${PERSONAS[u].label} (${u})` : `${u} (new account)`);

/** Plan C admin: committee membership changes only when QUORUM different IT admins approve. */
export function SimAdmin() {
  const { authenticated, getValueFromIdToken } = useAuth();
  const me = String(getValueFromIdToken("preferred_username") ?? "");
  const [state, setState] = useState<View | null>(null);
  const [subject, setSubject] = useState("admin1");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    const r = await api<View & { error?: string }>("/api/sim/committee");
    if (r.status === 403) return setError("This page is for university IT admins.");
    if (r.status !== 200) return setError(r.data.error ?? `Could not load the committee (${r.status}).`);
    setState(r.data);
  }, []);
  useEffect(() => {
    if (authenticated) load();
  }, [authenticated, load]);

  async function send(body: object) {
    setBusy(true);
    setError("");
    try {
      const r = await api<View & { error?: string }>("/api/sim/committee", { method: "POST", body: JSON.stringify(body) });
      if (r.status !== 200) throw new Error(r.data.error ?? `That didn't work (${r.status}).`);
      setState(r.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  const isMember = !!state?.committee.includes(subject);
  const requests = [...(state?.requests ?? [])].reverse();

  return (
    <Shell
      title="Admin"
      eyebrow="University IT"
      intro={`Who can read reports changes only when ${QUORUM} of 3 IT admins approve. No single admin, including you, can let themselves in.`}
    >
      <div className="timeline" aria-busy={busy}>
        <section className="card stack rise" style={{ "--i": 1 } as React.CSSProperties} aria-labelledby="members">
          <div className="card-head" style={{ marginBottom: 0 }}>
            <span className="step-num" aria-hidden="true">1</span>
            <div className="stack" style={{ gap: 4 }}>
              <h2 id="members">Committee members</h2>
              <p className="muted">Only these accounts can open reports. IT admins run the platform but are not on this list.</p>
            </div>
          </div>
          <div className="chips">
            {state?.committee.map((m) => <span key={m} className="badge badge-accent"><Icon name="users" size={14} />{name(m)}</span>)}
            {state && state.committee.length === 0 && <span className="muted">Nobody: no one can read reports right now.</span>}
            {!state && !error && <span className="muted">Loading…</span>}
          </div>
        </section>

        <section className="card stack rise" style={{ "--i": 2 } as React.CSSProperties} aria-labelledby="propose">
          <div className="card-head" style={{ marginBottom: 0 }}>
            <span className="step-num" aria-hidden="true">2</span>
            <div className="stack" style={{ gap: 4 }}>
              <h2 id="propose">Propose a change</h2>
              <p className="muted">A proposal changes nothing on its own. It waits for {QUORUM} different admins to approve it.</p>
            </div>
          </div>
          <div className="row">
            <label htmlFor="subject" className="sr-only">Account</label>
            <select id="subject" className="input" style={{ width: "auto", minWidth: 240 }} value={subject} onChange={(e) => setSubject(e.target.value)}>
              {(state?.accounts ?? Object.keys(PERSONAS)).map((p) => <option key={p} value={p}>{name(p)}</option>)}
            </select>
            <button disabled={busy || !state} onClick={() => send({ op: "propose", subject, change: isMember ? "remove" : "add" })} className="btn btn-primary magnetic">
              <Icon name="key" size={16} />{isMember ? "Propose removing" : "Propose adding"}
            </button>
          </div>
        </section>

        <section className="card stack rise" style={{ "--i": 3 } as React.CSSProperties} aria-labelledby="requests">
          <div className="card-head" style={{ marginBottom: 0 }}>
            <span className="step-num" aria-hidden="true">3</span>
            <div className="stack" style={{ gap: 4 }}>
              <h2 id="requests">Change requests</h2>
              <p className="muted">Sign in as another IT admin to add the second approval.</p>
            </div>
          </div>
          {error && <Alert kind="error">{error}</Alert>}
          {requests.length === 0 && <p className="muted">No change requests yet.</p>}
          <ul className="checklist" aria-live="polite">
            {requests.map((r) => {
              const mine = r.approvals.includes(me);
              return (
                <li key={r.id} className="request">
                  <div className="stack" style={{ gap: 6 }}>
                    <strong>{r.change === "add" ? "Add" : "Remove"} {name(r.subject)} {r.change === "add" ? "to" : "from"} the committee</strong>
                    <span className="muted small">Proposed by {r.requestedBy}{r.approvals.length > 0 && ` · approved by ${r.approvals.join(", ")}`}</span>
                    <span className="quorum" aria-label={`${r.approvals.length} of ${QUORUM} approvals`}>
                      {Array.from({ length: QUORUM }, (_, i) => <span key={i} className={i < r.approvals.length ? "on" : ""} />)}
                      <span className="small muted">{Math.min(r.approvals.length, QUORUM)} of {QUORUM} approvals</span>
                    </span>
                  </div>
                  {r.status === "applied" ? (
                    <span className="badge badge-success"><Icon name="check" size={14} />Applied</span>
                  ) : (
                    <button disabled={busy || mine} onClick={() => send({ op: "approve", id: r.id })} className="btn btn-ghost btn-sm">
                      <Icon name={mine ? "check" : "shield"} size={16} />{mine ? "You approved" : "Approve"}
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        </section>
      </div>
    </Shell>
  );
}
