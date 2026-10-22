"use client";

import Lenis from "lenis";
import { useEffect, useState } from "react";

const reducedMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/** Smooth, weighted scrolling like the editorial reference sites. Off for reduced motion. */
export function useSmoothScroll(path: string) {
  const [lenis, setLenis] = useState<Lenis | null>(null);
  useEffect(() => {
    if (reducedMotion()) return;
    const l = new Lenis({ autoRaf: true, lerp: 0.11 });
    setLenis(l);
    return () => l.destroy();
  }, []);
  // a new page starts at the top; Lenis would otherwise keep easing toward the old position
  useEffect(() => {
    lenis?.scrollTo(0, { immediate: true });
  }, [lenis, path]);
}

/**
 * One window listener drives three pointer effects (mouse only, never touch):
 * a spotlight that follows the cursor across any `.card`, a slight magnetic pull on `.magnetic` buttons,
 * and a soft ring that trails the cursor and swells over anything clickable.
 */
export function usePointerEffects() {
  useEffect(() => {
    const ring = document.querySelector<HTMLElement>(".cursor");
    let tx = 0, ty = 0, cx = 0, cy = 0, raf = 0;
    const follow = () => {
      cx += (tx - cx) * 0.2;
      cy += (ty - cy) * 0.2;
      ring?.style.setProperty("transform", `translate3d(${cx.toFixed(1)}px, ${cy.toFixed(1)}px, 0)`);
      raf = Math.abs(tx - cx) + Math.abs(ty - cy) > 0.3 ? requestAnimationFrame(follow) : 0;
    };
    let magnet: HTMLElement | null = null;
    const release = () => {
      magnet?.style.setProperty("--tx", "0px");
      magnet?.style.setProperty("--ty", "0px");
      magnet = null;
    };
    const leave = () => {
      release();
      ring?.classList.remove("on");
    };
    const onMove = (e: PointerEvent) => {
      if (e.pointerType !== "mouse") return;
      const target = e.target as Element | null;
      const card = target?.closest?.<HTMLElement>(".card");
      if (card) {
        const r = card.getBoundingClientRect();
        card.style.setProperty("--mx", `${e.clientX - r.left}px`);
        card.style.setProperty("--my", `${e.clientY - r.top}px`);
      }
      if (reducedMotion()) return;
      if (ring) {
        tx = e.clientX;
        ty = e.clientY;
        ring.classList.add("on");
        ring.classList.toggle("is-link", !!target?.closest?.("a, button:not(:disabled), label, summary, input, textarea"));
        if (!raf) raf = requestAnimationFrame(follow);
      }
      const m = target?.closest?.<HTMLElement>(".magnetic") ?? null;
      if (m !== magnet) release();
      if (!m) return;
      magnet = m;
      const r = m.getBoundingClientRect();
      const dx = (e.clientX - (r.left + r.width / 2)) / (r.width / 2);
      const dy = (e.clientY - (r.top + r.height / 2)) / (r.height / 2);
      m.style.setProperty("--tx", `${(dx * 6).toFixed(2)}px`);
      m.style.setProperty("--ty", `${(dy * 4).toFixed(2)}px`);
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    document.addEventListener("pointerleave", leave);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("pointermove", onMove);
      document.removeEventListener("pointerleave", leave);
    };
  }, []);
}

/** A headline whose words rise one by one out of their own masks. `*word*` is set in italic teal. */
export function SplitWords({ text }: { text: string }) {
  return (
    <span className="split">
      {text.split(" ").map((word, i) => {
        const em = word.startsWith("*") && word.endsWith("*");
        const w = em ? word.slice(1, -1) : word;
        return (
          <span key={i}>
            <span className="w"><span style={{ "--i": i } as React.CSSProperties}>{em ? <em>{w}</em> : w}</span></span>{" "}
          </span>
        );
      })}
    </span>
  );
}

const GLYPHS = "ABCDEFGHJKLMNPQRSTUVWXYZ0123456789+/=#$%&";
const SCRAMBLE_LIMIT = 900; // longer reports reveal their tail at the end

/** Shows `text` resolving from cipher glyphs into plaintext, left to right. Screen readers get the text directly. */
export function Scramble({ text, duration = 1100 }: { text: string; duration?: number }) {
  const [shown, setShown] = useState(text);

  useEffect(() => {
    if (reducedMotion()) return setShown(text);
    const limit = Math.min(text.length, SCRAMBLE_LIMIT);
    const start = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const p = Math.min(1, (now - start) / duration);
      const done = Math.floor(p * p * (3 - 2 * p) * limit); // smoothstep: slow start, quick middle, soft landing
      let s = text.slice(0, done);
      for (let i = done; i < limit; i++) {
        const c = text[i];
        s += c === " " || c === "\n" ? c : GLYPHS[(Math.random() * GLYPHS.length) | 0];
      }
      setShown(p < 1 ? s : text);
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [text, duration]);

  return (
    <>
      <span className="sr-only">{text}</span>
      <span aria-hidden="true">{shown}</span>
    </>
  );
}
