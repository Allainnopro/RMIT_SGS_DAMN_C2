"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { type Persona, PERSONAS, SIMULATED } from "@/lib/simPersonas";
import { useSimAuth } from "../auth";
import { Icon, type IconName } from "../icons";
import { Alert, Shell } from "../ui";

const ABOUT: Record<Persona, readonly [IconName, string]> = {
  reporter1: ["send", "Files reports. Can write to the inbox, never read it."],
  committee1: ["inbox", "On the independent committee. The only account that can open reports."],
  admin1: ["server", "University IT. Runs the platform and proposes changes, but can't read reports."],
  admin2: ["server", "University IT. A second admin, needed to approve any committee change."],
  admin3: ["server", "University IT. A third admin."],
};

// Only internal paths: a crafted ?next= must never send someone to another site after sign-in.
const safeNext = (next: string | null) => (next && next.startsWith("/") && !next.startsWith("//") ? next : "/");

export default function SignInPage() {
  if (!SIMULATED) {
    return <Shell title="Sign in" requireAuth={false}><p className="muted">This build signs in with Tide: use the Sign in button.</p></Shell>;
  }
  return <SimSignIn />;
}

function SimSignIn() {
  const router = useRouter();
  const { refresh } = useSimAuth();
  const [busy, setBusy] = useState<Persona | null>(null);
  const [error, setError] = useState("");

  async function pick(persona: Persona) {
    setBusy(persona);
    setError("");
    try {
      const r = await fetch("/api/sim/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ persona }) });
      if (!r.ok) throw new Error(`Sign-in failed (${r.status}).`);
      await refresh();
      router.push(safeNext(new URLSearchParams(window.location.search).get("next")));
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setBusy(null);
    }
  }

  return (
    <Shell
      title="Sign in"
      eyebrow="Simulated Tide sign-in · Plan C"
      requireAuth={false}
      intro="Tide's network is under heavy load today, so this stands in for Tide sign-in. Pick who you are: the server signs your session and enforces the same roles."
    >
      {error && <Alert kind="error">{error}</Alert>}
      <ul className="persona-grid">
        {(Object.keys(PERSONAS) as Persona[]).map((p, i) => (
          <li key={p} className="rise" style={{ "--i": i + 1 } as React.CSSProperties}>
            <button className="card card-hover persona" disabled={!!busy} onClick={() => pick(p)} aria-busy={busy === p}>
              <span className="icon-tile">{busy === p ? <span className="spinner" aria-hidden="true" /> : <Icon name={ABOUT[p][0]} />}</span>
              <span className="stack" style={{ gap: 4 }}>
                <strong>{PERSONAS[p].label}</strong>
                <span className="mono muted">{p}</span>
                <span className="muted small">{ABOUT[p][1]}</span>
              </span>
            </button>
          </li>
        ))}
      </ul>
    </Shell>
  );
}
