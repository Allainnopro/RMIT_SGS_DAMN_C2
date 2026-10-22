"use client";

import { useTideCloak } from "@tidecloak/nextjs";
import { useCallback, useEffect, useState } from "react";
import { INBOX_RECORD } from "@/lib/constants";
import { decryptForRecord } from "@/lib/tide/relationship";
import { describeTideError } from "@/lib/tideErrors";
import { api, Shell, s } from "../ui";

interface Report {
  category: string;
  description: string;
  when?: string;
  where?: string;
  contact?: { name?: string; contact?: string };
}
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

  const load = useCallback(async () => {
    setError("");
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
          return { id, createdAt, report: JSON.parse(await decryptForRecord(ciphertext, INBOX_RECORD, policy)) as Report };
        } catch (err) {
          return { id, createdAt, error: describeTideError(err) };
        }
      })));
    } catch (err) {
      setError(describeTideError(err));
    }
  }, []);

  useEffect(() => {
    if (authenticated) load();
  }, [authenticated, load]);

  return (
    <Shell title="Committee inbox">
      <p style={s.muted}>Reports are decrypted in this browser by the Tide network, only for members of the committee.</p>
      {error && <p role="alert" style={s.error}>{error}</p>}
      {items?.length === 0 && <p>No reports yet.</p>}
      {items?.map((it) => (
        <article key={it.id} style={s.card}>
          <p style={{ ...s.muted, marginTop: 0 }}>Receipt {it.id} · {new Date(it.createdAt).toLocaleString()}</p>
          {it.error ? <p style={s.error}>{it.error}</p> : it.report && (
            <>
              <h2 style={{ margin: "0 0 0.5rem" }}>{it.report.category}</h2>
              <p style={{ whiteSpace: "pre-wrap" }}>{it.report.description}</p>
              {(it.report.when || it.report.where) && <p style={s.muted}>{[it.report.when, it.report.where].filter(Boolean).join(" · ")}</p>}
              <p style={{ marginBottom: 0 }}>
                {it.report.contact ? `Reporter: ${it.report.contact.name || "(no name)"} · ${it.report.contact.contact || "(no contact)"}` : "No name given: anonymous to the committee."}
              </p>
            </>
          )}
        </article>
      ))}
    </Shell>
  );
}
