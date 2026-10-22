"use client";

import { useTideCloak } from "@tidecloak/nextjs";
import { useEffect, useState } from "react";
import { Icon } from "../icons";
import { Alert, api, Shell } from "../ui";

interface StoreView {
  reports: { id: string; createdAt: string; ciphertext: string }[];
  policies: Record<string, string>;
}

export default function ServerViewPage() {
  const { authenticated } = useTideCloak();
  const [store, setStore] = useState<StoreView | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!authenticated) return;
    api<StoreView>("/api/server-view")
      .then((r) => (r.status === 200 ? setStore(r.data) : setError(r.status === 403 ? "This page is for university IT." : `Could not load (${r.status}).`)))
      .catch((err) => setError(String(err)));
  }, [authenticated]);

  const policies = store ? Object.entries(store.policies ?? {}) : [];

  return (
    <Shell
      title="What the server sees"
      eyebrow="University IT"
      intro="Everything SafeVoice's server holds. No key on this server can turn any of it back into a report."
    >
      <div className="stack">
        {error && <Alert kind="error">{error}</Alert>}
        {!store && !error && <div className="skeleton" />}
        {store && (
          <>
            <div className="grid grid-3">
              <div className="card">
                <p className="muted small">Reports stored</p>
                <p style={{ font: "600 2rem var(--font-heading)" }}>{store.reports.length}</p>
              </div>
              <div className="card">
                <p className="muted small">Readable by this server</p>
                <p style={{ font: "600 2rem var(--font-heading)", color: "var(--success-text)" }}>0</p>
              </div>
              <div className="card">
                <p className="muted small">Signed policies</p>
                <p style={{ font: "600 2rem var(--font-heading)" }}>{policies.length}</p>
              </div>
            </div>

            <section className="card stack" aria-labelledby="records">
              <div className="row" style={{ justifyContent: "space-between" }}>
                <h2 id="records">Stored reports</h2>
                <span className="badge badge-success"><Icon name="lock" size={14} />All encrypted</span>
              </div>
              {store.reports.length === 0 && <p className="muted">Nothing stored yet.</p>}
              {store.reports.map((r) => (
                <div key={r.id} className="stack" style={{ gap: 6 }}>
                  <div className="row" style={{ justifyContent: "space-between" }}>
                    <span className="mono">{r.id}</span>
                    <time className="muted small" dateTime={r.createdAt}>{new Date(r.createdAt).toLocaleString()}</time>
                  </div>
                  <p className="cipher" aria-label="Encrypted report contents">{r.ciphertext}</p>
                </div>
              ))}
            </section>

            {policies.length > 0 && (
              <section className="card stack" aria-labelledby="policies">
                <h2 id="policies">Signed access policies</h2>
                <p className="muted">Public rules signed by the Tide network. They say who may write and who may read; they are not keys.</p>
                {policies.map(([name, b64]) => (
                  <div key={name} className="row" style={{ justifyContent: "space-between" }}>
                    <span className="mono">{name}</span>
                    <span className="badge">{Math.round((b64.length * 3) / 4).toLocaleString()} bytes</span>
                  </div>
                ))}
              </section>
            )}

            <details className="card">
              <summary><Icon name="file" size={16} />Raw store file</summary>
              <pre className="code">{JSON.stringify(store, null, 2)}</pre>
            </details>
          </>
        )}
      </div>
    </Shell>
  );
}
