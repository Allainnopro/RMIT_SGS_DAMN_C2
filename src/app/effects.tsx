"use client";

import { useEffect, useState } from "react";

const reducedMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/**
 * One window listener drives two pointer effects (mouse only, never touch):
 * a spotlight that follows the cursor across any `.card`, and a slight magnetic pull on `.magnetic` buttons.
 */
export function usePointerEffects() {
  useEffect(() => {
    let magnet: HTMLElement | null = null;
    const release = () => {
      magnet?.style.setProperty("--tx", "0px");
      magnet?.style.setProperty("--ty", "0px");
      magnet = null;
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
    document.addEventListener("pointerleave", release);
    return () => {
      window.removeEventListener("pointermove", onMove);
      document.removeEventListener("pointerleave", release);
    };
  }, []);
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
