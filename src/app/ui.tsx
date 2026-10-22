"use client";

import { IAMService } from "@tidecloak/js";
import { useTideCloak } from "@tidecloak/nextjs";

/** Calls our API. secureFetch attaches the token AND the DPoP proof our routes verify. */
export async function api<T = Record<string, unknown>>(path: string, init: RequestInit = {}): Promise<{ status: number; data: T }> {
  const res = await IAMService.secureFetch(new URL(path, window.location.origin).toString(), {
    ...init,
    headers: { "Content-Type": "application/json", ...init.headers },
  });
  const text = await res.text();
  return { status: res.status, data: (text ? JSON.parse(text) : {}) as T };
}

const NAV = [
  ["/report", "File a report"],
  ["/committee", "Committee"],
  ["/server-view", "What the server sees"],
  ["/admin", "Admin"],
] as const;

/** Page frame: signs the user in first, then shows the nav and the page. */
export function Shell({ title, children }: { title: string; children: React.ReactNode }) {
  const { authenticated, isInitializing, login, logout, getValueFromIdToken } = useTideCloak();
  if (isInitializing) return <main style={s.wrap}><p>Loading…</p></main>;
  if (!authenticated) {
    return (
      <main style={s.wrap}>
        <h1>{title}</h1>
        <p style={s.muted}>Sign in with your Tide account to continue.</p>
        <button onClick={login} style={s.btn}>Sign in with Tide</button>
      </main>
    );
  }
  return (
    <main style={s.wrap}>
      <header style={s.header}>
        <a href="/" style={s.brand}>SafeVoice</a>
        <nav aria-label="Main" style={s.nav}>
          {NAV.map(([href, label]) => <a key={href} href={href} style={s.navLink}>{label}</a>)}
        </nav>
        <span style={s.muted}>{getValueFromIdToken("preferred_username")}</span>
        <button onClick={logout} style={s.btnQuiet}>Sign out</button>
      </header>
      <h1>{title}</h1>
      {children}
    </main>
  );
}

export const s: Record<string, React.CSSProperties> = {
  wrap: { maxWidth: 760, margin: "0 auto", lineHeight: 1.5 },
  header: { display: "flex", flexWrap: "wrap", gap: "0.75rem", alignItems: "center", borderBottom: "1px solid #2a2a2a", paddingBottom: "0.75rem", marginBottom: "1rem" },
  brand: { color: "#ededed", fontWeight: 700, textDecoration: "none", marginRight: "auto" },
  nav: { display: "flex", flexWrap: "wrap", gap: "0.75rem" },
  navLink: { color: "#93c5fd" },
  muted: { color: "#a3a3a3" },
  card: { background: "#161616", border: "1px solid #2a2a2a", borderRadius: 8, padding: "1rem", marginBottom: "1rem" },
  label: { display: "block", fontWeight: 600, margin: "0.75rem 0 0.25rem" },
  input: { width: "100%", boxSizing: "border-box", padding: "0.6rem", background: "#0f0f0f", color: "#ededed", border: "1px solid #3a3a3a", borderRadius: 6, fontSize: "1rem" },
  btn: { background: "#2563eb", color: "#fff", border: "none", borderRadius: 6, padding: "0.7rem 1.4rem", fontSize: "1rem", cursor: "pointer" },
  btnQuiet: { background: "#333", color: "#ededed", border: "none", borderRadius: 6, padding: "0.4rem 0.9rem", cursor: "pointer" },
  error: { color: "#fca5a5", background: "#2a1212", border: "1px solid #7f1d1d", borderRadius: 6, padding: "0.75rem" },
  ok: { color: "#86efac", background: "#0f2a17", border: "1px solid #166534", borderRadius: 6, padding: "0.75rem" },
  pre: { whiteSpace: "pre-wrap", wordBreak: "break-all", fontSize: "0.8rem", background: "#0f0f0f", padding: "0.75rem", borderRadius: 6, border: "1px solid #2a2a2a" },
};
