"use client";

import { IAMService } from "@tidecloak/js";
import { useTideCloak } from "@tidecloak/nextjs";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { usePointerEffects, useSmoothScroll } from "./effects";
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

// The last signed-in name, shown while the SDK re-checks the session after a hard refresh. Display only:
// what the user can do is still decided by the real session and the server.
const USER_KEY = "safevoice.user";
const readCachedUser = () => {
  try {
    return sessionStorage.getItem(USER_KEY) ?? "";
  } catch {
    return "";
  }
};
const writeCachedUser = (u: string) => {
  try {
    if (u) sessionStorage.setItem(USER_KEY, u);
    else sessionStorage.removeItem(USER_KEY);
  } catch {
    // storage blocked: the slot just shows the placeholder
  }
};

/** One highlight that springs to the hovered or focused link, and slides to the new page on navigation. */
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
  }, [path, place, current]);

  useEffect(() => {
    // first placement happens without animation, so the highlight never flies in from the corner
    // (a timer, not requestAnimationFrame: rAF never fires in a hidden or throttled tab)
    const id = window.setTimeout(() => setReady(true), 60);
    const ro = new ResizeObserver(() => place(current()));
    if (navRef.current) ro.observe(navRef.current);
    return () => {
      window.clearTimeout(id);
      ro.disconnect();
    };
  }, [place, current]);

  return (
    <nav ref={navRef} aria-label="Main" className="nav" onPointerLeave={() => place(current())} onBlur={() => place(current())}>
      <span
        aria-hidden="true"
        className={`nav-pill${ready ? " ready" : ""}`}
        style={{ transform: `translate3d(${pill.x}px, ${pill.y}px, 0)`, width: pill.w, height: pill.h, opacity: pill.o }}
      />
      {NAV.map(([href, label, icon]) => (
        <Link
          key={href}
          href={href}
          className="nav-link"
          aria-current={path === href ? "page" : undefined}
          onPointerEnter={(e) => place(e.currentTarget)}
          onFocus={(e) => place(e.currentTarget)}
        >
          <Icon name={icon} size={16} />
          {label}
        </Link>
      ))}
    </nav>
  );
}

function Account() {
  const { authenticated, isInitializing, login, logout, getValueFromIdToken } = useTideCloak();
  const [cached, setCached] = useState("");
  const user = authenticated ? String(getValueFromIdToken("preferred_username") ?? "") : "";

  useEffect(() => setCached(readCachedUser()), []);
  useEffect(() => {
    if (!isInitializing) writeCachedUser(user);
  }, [isInitializing, user]);

  const name = isInitializing ? cached : user;
  if (isInitializing && !name) return <span className="account-skel" aria-hidden="true" />;
  if (!name) return <button onClick={login} className="btn btn-primary btn-sm">Sign in</button>;
  return (
    <>
      <span className="user-chip" title={name} aria-busy={isInitializing}>
        <span className={`dot${isInitializing ? " dot-pending" : ""}`} aria-hidden="true" />
        <span className="sr-only">Signed in as </span>
        {shortUser(name)}
      </span>
      <button
        onClick={() => {
          writeCachedUser("");
          logout();
        }}
        disabled={isInitializing}
        className="btn btn-quiet btn-sm"
      >
        <Icon name="logout" size={16} />
        Sign out
      </button>
    </>
  );
}

/** App frame, mounted once in the layout: it survives page changes, so the session never re-initialises on navigation. */
export function Chrome({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  usePointerEffects();
  useSmoothScroll(path);
  return (
    <>
      <div className="intro" aria-hidden="true">
        <div className="intro-inner">
          <Image src="/logo.png" alt="" width={96} height={96} priority />
          <span className="intro-word">
            {[..."SafeVoice"].map((c, i) => <span key={i} style={{ "--i": i } as React.CSSProperties}>{c}</span>)}
          </span>
        </div>
      </div>
      <div className="aurora" aria-hidden="true">
        <span className="blob b1" />
        <span className="blob b2" />
        <span className="blob b3" />
      </div>
      <div className="progress" aria-hidden="true" />
      <div className="cursor" aria-hidden="true" />
      <div className="app">
        <a href="#main" className="skip-link">Skip to content</a>
        <header className="topbar">
          <div className="container topbar-inner" style={{ maxWidth: 1240 }}>
            <Link href="/" className="brand">
              <Image src="/logo.png" alt="" width={38} height={38} priority />
              SafeVoice
            </Link>
            <Nav path={path} />
            {/* fixed-size slot: the bar keeps its shape while the session loads */}
            <div className="account"><Account /></div>
          </div>
        </header>
        <main id="main" className="container page">{children}</main>
        <footer className="container footer">
          <div className="footer-row">
            <span><Icon name="lock" size={14} />Protected by TideCloak. No single admin holds the keys.</span>
            <span>RMIT Hackathon 2026 · Team DAMN</span>
          </div>
          <span className="wordmark" aria-hidden="true">SafeVoice</span>
        </footer>
      </div>
    </>
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

/** A page: waits for the session, shows the sign-in gate on protected pages, then the title and content. */
export function Shell({ title, intro, eyebrow, actions, requireAuth = true, children }: ShellProps) {
  const { authenticated, isInitializing, login } = useTideCloak();

  if (requireAuth && isInitializing) {
    return (
      <div className="empty" aria-busy="true">
        <span className="spinner" aria-hidden="true" />
        <p>Connecting securely…</p>
      </div>
    );
  }
  if (requireAuth && !authenticated) {
    return (
      <section className="card rise" style={{ maxWidth: 520, margin: "24px auto 0", textAlign: "center" }}>
        <div className="stack" style={{ justifyItems: "center" }}>
          <span className="icon-tile" style={{ width: 60, height: 60, borderRadius: 18 }}><Icon name="lock" size={26} /></span>
          <h1 style={{ fontSize: "1.65rem" }}>{title}</h1>
          <p className="muted">Sign in with your Tide account to continue. Tide checks who you are without SafeVoice ever holding your password or keys.</p>
          <button onClick={login} className="btn btn-primary magnetic">Sign in with Tide <Icon name="arrowRight" size={18} /></button>
        </div>
      </section>
    );
  }
  return (
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

export function Alert({ kind, children }: { kind: "error" | "success" | "info"; children: React.ReactNode }) {
  const icon: IconName = kind === "error" ? "alert" : kind === "success" ? "check" : "lock";
  return (
    <div className={`alert alert-${kind}`} role={kind === "error" ? "alert" : "status"}>
      <Icon name={icon} size={18} />
      <div>{children}</div>
    </div>
  );
}
