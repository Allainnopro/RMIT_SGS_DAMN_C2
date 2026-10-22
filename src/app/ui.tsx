"use client";

import { IAMService } from "@tidecloak/js";
import { useTideCloak } from "@tidecloak/nextjs";
import { usePathname } from "next/navigation";
import { Icon, type IconName } from "./icons";

/** Calls our API. secureFetch attaches the token AND the DPoP proof our routes verify. */
export async function api<T = Record<string, unknown>>(path: string, init: RequestInit = {}): Promise<{ status: number; data: T }> {
  const res = await IAMService.secureFetch(new URL(path, window.location.origin).toString(), {
    ...init,
    headers: { "Content-Type": "application/json", ...init.headers },
  });
  const text = await res.text();
  return { status: res.status, data: (text ? JSON.parse(text) : {}) as T };
}

const NAV: ReadonlyArray<readonly [string, string, IconName]> = [
  ["/report", "File a report", "send"],
  ["/committee", "Committee", "inbox"],
  ["/server-view", "Server view", "server"],
  ["/admin", "Admin", "key"],
];

// Tide usernames are a 64-hex id; show a short, recognisable form.
const shortUser = (u: string) => (/^[0-9a-f]{20,}$/i.test(u) ? `${u.slice(0, 6)}…${u.slice(-4)}` : u);

type ShellProps = {
  title?: string;
  intro?: React.ReactNode;
  eyebrow?: string;
  actions?: React.ReactNode;
  requireAuth?: boolean;
  children: React.ReactNode;
};

/** Page frame: top bar, sign-in gate for protected pages, then the page itself. */
export function Shell({ title, intro, eyebrow, actions, requireAuth = true, children }: ShellProps) {
  const { authenticated, isInitializing, login, logout, getValueFromIdToken } = useTideCloak();
  const path = usePathname();
  const user = authenticated ? String(getValueFromIdToken("preferred_username") ?? "") : "";

  let body: React.ReactNode;
  if (isInitializing) {
    body = (
      <div className="empty" aria-busy="true">
        <span className="spinner" aria-hidden="true" />
        <p>Connecting securely…</p>
      </div>
    );
  } else if (requireAuth && !authenticated) {
    body = (
      <section className="card" style={{ maxWidth: 520, margin: "24px auto 0", textAlign: "center" }}>
        <div className="stack" style={{ justifyItems: "center" }}>
          <span className="icon-tile" style={{ width: 56, height: 56, borderRadius: 16 }}><Icon name="lock" size={26} /></span>
          <h1 style={{ fontSize: "1.6rem" }}>{title}</h1>
          <p className="muted">Sign in with your Tide account to continue. Tide checks who you are without SafeVoice ever holding your password or keys.</p>
          <button onClick={login} className="btn btn-primary">Sign in with Tide <Icon name="arrowRight" size={18} /></button>
        </div>
      </section>
    );
  } else {
    body = (
      <>
        {title && (
          <header className="page-head">
            <div>
              {eyebrow && <span className="eyebrow">{eyebrow}</span>}
              <h1>{title}</h1>
              {intro && <p className="lead">{intro}</p>}
            </div>
            {actions}
          </header>
        )}
        {children}
      </>
    );
  }

  return (
    <>
      <a href="#main" className="skip-link">Skip to content</a>
      <header className="topbar">
        <div className="container topbar-inner">
          <a href="/" className="brand">
            <span className="brand-mark"><Icon name="shield" size={18} /></span>
            SafeVoice
          </a>
          <nav aria-label="Main" className="nav">
            {NAV.map(([href, label, icon]) => (
              <a key={href} href={href} className="nav-link" aria-current={path === href ? "page" : undefined}>
                <Icon name={icon} size={16} />
                {label}
              </a>
            ))}
          </nav>
          <div className="account">
            {authenticated ? (
              <>
                <span className="user-chip" title={user}>
                  <span className="dot" aria-hidden="true" />
                  <span className="sr-only">Signed in as </span>
                  {shortUser(user)}
                </span>
                <button onClick={logout} className="btn btn-quiet btn-sm">
                  <Icon name="logout" size={16} />
                  Sign out
                </button>
              </>
            ) : (
              !isInitializing && <button onClick={login} className="btn btn-primary btn-sm">Sign in</button>
            )}
          </div>
        </div>
      </header>
      <main id="main" className="container page">{body}</main>
      <footer className="container footer">
        <Icon name="lock" size={14} />
        Protected by TideCloak. No single admin holds the keys.
      </footer>
    </>
  );
}

export function Alert({ kind, children }: { kind: "error" | "success" | "info"; children: React.ReactNode }) {
  const icon: IconName = kind === "error" ? "alert" : kind === "success" ? "check" : "lock";
  return (
    <div className={`alert alert-${kind}`} role={kind === "error" ? "alert" : "status"}>
      <Icon name={icon} size={18} />
      <div>{children}</div>
    </div>
  );
}
