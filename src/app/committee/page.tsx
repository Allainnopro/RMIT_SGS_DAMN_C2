"use client";

import { useTideCloak } from "@tidecloak/nextjs";
import { useCallback, useEffect, useState } from "react";
import { INBOX_RECORD } from "@/lib/constants";
import { parseReport, type Report } from "@/lib/report";
import { decryptForRecord } from "@/lib/tide/relationship";
import { describeTideError } from "@/lib/tideErrors";
import { Scramble } from "../effects";
import { Icon } from "../icons";
import { Alert, api, Shell } from "../ui";

interface Shown {
  id: string;
  createdAt: string;
  report?: Report;
  error?: string;
}
interface Stored {
  id: string;
  createdAt: string;
  ciphertext: string;
}

export default function CommitteePage() {
  const { authenticated } = useTideCloak();
  const [items, setItems] = useState<Shown[] | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setError("");
    setLoading(true);
    try {
      const r = await api<{ reports?: Stored[]; error?: string }>("/api/reports");
      if (r.status === 403) return setError("This page is for committee members.");
      if (r.status !== 200 || !r.data.reports) throw new Error(r.data.error ?? `Could not load reports (${r.status}).`);
      const p = await api<{ policy?: string; error?: string }>("/api/policies/inbox-read");
      if (p.status === 404) return setError("SafeVoice isn't set up yet: an admin must approve the inbox policies.");
      if (p.status !== 200 || !p.data.policy) throw new Error(p.data.error ?? `Could not load the committee policy (${p.status}).`);
      const policy = p.data.policy;
      const newest = [...r.data.reports].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
      // Decrypted here, in the committee member's browser. The server only ever had ciphertext.
      setItems(await Promise.all(newest.map(async ({ id, createdAt, ciphertext }) => {
        try {
          return { id, createdAt, report: parseReport(await decryptForRecord(ciphertext, INBOX_RECORD, policy)) };
        } catch (err) {
          return { id, createdAt, error: describeTideError(err) };
        }
      })));
    } catch (err) {
      setError(describeTideError(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (authenticated) load();
  }, [authenticated, load]);

  return (
    <Shell
      title="Committee inbox"
      eyebrow="Committee"
      intro="Reports are decrypted in this browser, and the Tide network only helps members of the committee."
      actions={
        <button onClick={load} disabled={loading} className="btn btn-ghost btn-sm">
          {loading ? <span className="spinner" aria-hidden="true" /> : <Icon name="refresh" size={16} />}
          Refresh
        </button>
      }
    >
      <div className="stack" aria-live="polite" aria-busy={loading}>
        {error && <Alert kind="error">{error}</Alert>}
        {loading && !items && [0, 1].map((i) => <div key={i} className="skeleton" />)}
        {items?.length === 0 && (
          <div className="card empty rise">
            <span className="icon-tile"><Icon name="inbox" size={26} /></span>
            <h2>No reports yet</h2>
            <p>New reports appear here as soon as they are filed.</p>
          </div>
        )}
        {items && items.length > 0 && <p className="muted small">{items.length} report{items.length === 1 ? "" : "s"}, newest first</p>}
        {items?.map((it, i) => (
          <article key={it.id} className="card card-hover rise" style={{ "--i": Math.min(i, 6) } as React.CSSProperties}>
            {it.error ? (
              <Alert kind="error">{it.error}</Alert>
            ) : it.report && (
              <div className="stack">
                <div className="row" style={{ justifyContent: "space-between" }}>
                  <span className="badge badge-accent">{it.report.category}</span>
                  <time className="muted small" dateTime={it.createdAt}>{new Date(it.createdAt).toLocaleString()}</time>
                </div>
                <p className="prose"><Scramble text={it.report.description} /></p>
                {(it.report.when || it.report.where) && (
                  <div className="meta">
                    {it.report.when && <span><Icon name="clock" size={16} />{it.report.when}</span>}
                    {it.report.where && <span><Icon name="pin" size={16} />{it.report.where}</span>}
                  </div>
                )}
                <hr className="divider" style={{ margin: 0 }} />
                <div className="row" style={{ justifyContent: "space-between" }}>
                  {it.report.contact ? (
                    <span className="meta"><span><Icon name="user" size={16} />{it.report.contact.name || "No name given"}</span>{it.report.contact.contact && <span>{it.report.contact.contact}</span>}</span>
                  ) : (
                    <span className="badge"><Icon name="eyeOff" size={14} />Anonymous to the committee</span>
                  )}
                  <span className="mono muted">#{it.id.slice(0, 8)}</span>
                </div>
              </div>
            )}
          </article>
        ))}
      </div>
    </Shell>
  );
}
