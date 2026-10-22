"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { MIN_PASSWORD_LENGTH, PERSONAS, SIMULATED } from "@/lib/simPersonas";
import { useSimAuth } from "../auth";
import { Icon } from "../icons";
import { Alert, Shell } from "../ui";

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
  const [mode, setMode] = useState<"in" | "up">("in");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const creating = mode === "up";

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const r = await fetch(creating ? "/api/sim/register" : "/api/sim/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      if (!r.ok) throw new Error(((await r.json().catch(() => ({}))) as { error?: string }).error ?? `That didn't work (${r.status}).`);
      setPassword("");
      await refresh();
      router.push(safeNext(new URLSearchParams(window.location.search).get("next")));
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setBusy(false);
    }
  }

  const switchTo = (m: "in" | "up") => {
    setMode(m);
    setError("");
  };

  return (
    <Shell
      title={creating ? "Create your account" : "Sign in"}
      eyebrow="Simulated Tide sign-in · Plan C"
      requireAuth={false}
      intro="Tide's network is under heavy load today, so this stands in for Tide sign-in. Here our server checks your password; with live TideCloak it never would, because Tide's network verifies it without any single server holding it."
    >
      <div className="grid grid-2" style={{ alignItems: "start" }}>
        <form onSubmit={submit} className="card form rise" style={{ "--i": 1 } as React.CSSProperties} aria-busy={busy}>
          <div className="segmented" role="group" aria-label="Account">
            <button type="button" aria-pressed={!creating} onClick={() => switchTo("in")}>Sign in</button>
            <button type="button" aria-pressed={creating} onClick={() => switchTo("up")}>Create account</button>
          </div>
          <div className="field">
            <label htmlFor="username" className="label">Username</label>
            <input
              id="username"
              className="input"
              required
              autoComplete="username"
              autoCapitalize="none"
              spellCheck={false}
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              aria-describedby={creating ? "username-help" : undefined}
            />
            {creating && <span id="username-help" className="help">3 to 32 lowercase letters, digits, dots, dashes or underscores.</span>}
          </div>
          <div className="field">
            <label htmlFor="password" className="label">Password</label>
            <input
              id="password"
              type="password"
              className="input"
              required
              minLength={creating ? MIN_PASSWORD_LENGTH : undefined}
              autoComplete={creating ? "new-password" : "current-password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              aria-describedby={creating ? "password-help" : undefined}
            />
            {creating && <span id="password-help" className="help">At least {MIN_PASSWORD_LENGTH} characters.</span>}
          </div>
          {error && <Alert kind="error">{error}</Alert>}
          <button type="submit" disabled={busy} className="btn btn-primary magnetic">
            {busy ? <span className="spinner" aria-hidden="true" /> : <Icon name={creating ? "user" : "key"} size={18} />}
            {creating ? "Create account" : "Sign in"}
          </button>
          {creating && <p className="help">New accounts can file reports. Only a quorum of IT admins can add anyone to the committee.</p>}
        </form>

        <aside className="card stack rise" style={{ "--i": 2 } as React.CSSProperties} aria-labelledby="demo-accounts">
          <h2 id="demo-accounts" style={{ fontSize: "1.5rem" }}>Demo accounts</h2>
          <p className="muted small">Ready-made university accounts. Their password is <span className="mono">SIM_DEMO_PASSWORD</span> in your <span className="mono">.env.local</span> (see the README).</p>
          <ul className="checklist">
            {Object.entries(PERSONAS).map(([u, p]) => (
              <li key={u}>
                <Icon name={u.startsWith("admin") ? "server" : u === "committee1" ? "inbox" : "send"} size={18} />
                <span><span className="mono">{u}</span> <span className="muted">· {p.label}</span></span>
              </li>
            ))}
          </ul>
        </aside>
      </div>
    </Shell>
  );
}
