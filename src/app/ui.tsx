"use client";

import { IAMService } from "@tidecloak/js";
import { useTideCloak } from "@tidecloak/nextjs";
import { usePathname } from "next/navigation";
import { useCallback, useLayoutEffect, useRef, useState } from "react";
import { usePointerEffects } from "./effects";
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

/** One highlight that springs to the hovered or focused link, and back to the current page. */
function Nav({ path }: { path: string }) {
  const navRef = useRef<HTMLElement>(null);
  const [pill, setPill] = useState({ x: 0, y: 0, w: 0, h: 0, o: 0 });
  const [ready, setReady] = useState(false);

  const place = useCallback((el: HTMLElement | null) => {
    setPill((p) => (el ? { x: el.offsetLeft, y: el.offsetTop, w: el.offsetWidth, h: el.offsetHeight, o: 1 } : { ...p, o: 0 }));
  }, []);
  const current = useCallback(() => navRef.current?.querySelector<HTMLElement>('[aria-current="page"]') ?? null, []);

  useLayoutEffect(() => {
    place(current());
    // first placement happens without animation, so the highlight never flies in from the corner
    const id = requestAnimationFrame(() => setReady(true));
    const ro = new ResizeObserver(() => place(current()));
    if (navRef.current) ro.observe(navRef.current);
    return () => {
      cancelAnimationFrame(id);
      ro.disconnect();
    };
  }, [path, place, current]);

  return (
    <nav ref={navRef} aria-label="Main" className="nav" onPointerLeave={() => place(current())} onBlur={() => place(current())}>
      <span
        aria-hidden="true"
        className={`nav-pill${ready ? " ready" : ""}`}
        style={{ transform: `translate3d(${pill.x}px, ${pill.y}px, 0)`, width: pill.w, height: pill.h, opacity: pill.o }}
      />
      {NAV.map(([href, label, icon]) => (
        <a
          key={href}
          href={href}
          className="nav-link"
          aria-current={path === href ? "page" : undefined}
          onPointerEnter={(e) => place(e.currentTarget)}
          onFocus={(e) => place(e.currentTarget)}
        >
          <Icon name={icon} size={16} />
          {label}
        </a>
      ))}
    </nav>
  );
}

type ShellProps = {
  title?: string;
  intro?: React.ReactNode;
  eyebrow?: string;
  actions?: React.ReactNode;
  requireAuth?: boolean;
  children: React.ReactNode;
};

/** Page frame: aurora backdrop, top bar, sign-in gate for protected pages, then the page itself. */
export function Shell({ title, intro, eyebrow, actions, requireAuth = true, children }: ShellProps) {
  const { authenticated, isInitializing, login, logout, getValueFromIdToken } = useTideCloak();
  const path = usePathname();
  const user = authenticated ? String(getValueFromIdToken("preferred_username") ?? "") : "";
  usePointerEffects();

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
      <section className="card rise" style={{ maxWidth: 520, margin: "24px auto 0", textAlign: "center" }}>
        <div className="stack" style={{ justifyItems: "center" }}>
          <span className="icon-tile" style={{ width: 60, height: 60, borderRadius: 18 }}><Icon name="lock" size={26} /></span>
          <h1 style={{ fontSize: "1.65rem" }}>{title}</h1>
          <p className="muted">Sign in with your Tide account to continue. Tide checks who you are without SafeVoice ever holding your password or keys.</p>
          <button onClick={login} className="btn btn-primary magnetic">Sign in with Tide <Icon name="arrowRight" size={18} /></button>
        </div>
      </section>
    );
  } else {
    body = (
      <>
        {title && (
          <header className="page-head rise">
            <div>
              {eyebrow && <span className="eyebrow">{eyebrow}</span>}
              <h1><span className="text-gradient">{title}</span></h1>
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
      <div className="aurora" aria-hidden="true">
        <span className="blob b1" />
        <span className="blob b2" />
        <span className="blob b3" />
      </div>
      <div className="app">
        <a href="#main" className="skip-link">Skip to content</a>
        <header className="topbar">
          <div className="container topbar-inner" style={{ maxWidth: 1180 }}>
            <a href="/" className="brand">
              <span className="brand-mark"><Icon name="shield" size={18} /></span>
              SafeVoice
            </a>
            <Nav path={path} />
            {/* fixed-size slot: the bar keeps its shape while the session loads */}
            <div className="account">
              {isInitializing ? (
                <span className="account-skel" aria-hidden="true" />
              ) : authenticated ? (
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
                <button onClick={login} className="btn btn-primary btn-sm">Sign in</button>
              )}
            </div>
          </div>
        </header>
        <main id="main" className="container page">{body}</main>
        <footer className="container footer">
          <Icon name="lock" size={14} />
          Protected by TideCloak. No single admin holds the keys.
        </footer>
      </div>
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
