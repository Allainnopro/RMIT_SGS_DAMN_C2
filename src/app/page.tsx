"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Scramble, SplitWords } from "./effects";
import { Icon, type IconName } from "./icons";
import { Shell } from "./ui";

const MARQUEE = ["Confidential", "Sealed on your device", "No master key", "Only the committee can read", "Name optional"];

// Sample data for the illustration below. Nothing here comes from the live system.
const SAMPLE = "The fire exit on level 3 of Building 2 has been chained shut for two weeks. I told the lab manager and nothing changed.";
const SAMPLE_CIPHER = "AQIDBAVzYWZldm9pY2UtaW5ib3gAx9Kp2Lm4QvT7nZr0c1WfH8yUe3oJbGd6sIaN5tXqM0kVhRj2EwYzCuP9lB4iFgOm7DnSxA1LrKe6TvQ8yHb3Zw==";

type Line = readonly [IconName, string, boolean?];
const STORY: ReadonlyArray<{ title: string; text: string; who: string; sealed: boolean; scramble?: boolean; lines: Line[] }> = [
  {
    title: "You write it",
    text: "Describe what happened in any language. Your name and contact details are optional and off by default.",
    who: "Reporter · your browser",
    sealed: false,
    lines: [["user", "No name unless you choose to add one"]],
  },
  {
    title: "Sealed on your device",
    text: "Before anything leaves your browser, the report is encrypted under a rule that lets reporters write to the inbox and nothing more.",
    who: "Reporter · your browser",
    sealed: true,
    scramble: true,
    lines: [["lock", "Encrypted before it is sent"], ["eyeOff", "Not even you can open it again", true]],
  },
  {
    title: "The server keeps scrambled data",
    text: "SafeVoice stores ciphertext only. University IT, the platform and anyone who breaks in see exactly this, and no key on the server can undo it.",
    who: "SafeVoice server · University IT",
    sealed: true,
    lines: [["server", "No key stored on the server", true], ["key", "IT admins can't read it", true]],
  },
  {
    title: "Only the committee opens it",
    text: "Tide's network checks that the reader belongs to the independent committee, then helps decrypt in their browser. Adding a member needs a quorum of admins.",
    who: "Committee member · checked by Tide",
    sealed: false,
    scramble: true,
    lines: [["users", "Committee membership checked by Tide's network"], ["shield", "No single admin can add themselves"]],
  },
];

const CANNOT: ReadonlyArray<readonly [IconName, string]> = [
  ["server", "University IT and the platform operator"],
  ["alert", "Anyone who breaches the server"],
  ["key", "An admin who adds themselves to the committee without other admins approving"],
];

/** The step whose text sits in the middle of the viewport drives the sticky stage. */
function useActiveStep(count: number) {
  const refs = useRef<(HTMLLIElement | null)[]>([]);
  const [active, setActive] = useState(0);
  useEffect(() => {
    const io = new IntersectionObserver(
      (entries) => entries.forEach((e) => e.isIntersecting && setActive(Number((e.target as HTMLElement).dataset.step))),
      { rootMargin: "-45% 0px -45% 0px" },
    );
    refs.current.slice(0, count).forEach((el) => el && io.observe(el));
    return () => io.disconnect();
  }, [count]);
  return { refs, active };
}

function Stage({ step }: { step: number }) {
  const s = STORY[step];
  const body = s.sealed ? SAMPLE_CIPHER : SAMPLE;
  return (
    <div className={`card stage${step === 2 ? "" : " card-hover"}`}>
      <span className="stage-tag"><Icon name="file" size={14} />Illustration · sample data</span>
      {/* keyed on the step, so each change replays the entrance */}
      <div className="stage-body" key={step}>
        <div className="stage-who">
          <h3>{s.who}</h3>
          <span className={`badge${s.sealed ? " badge-accent" : ""}`}>
            <Icon name={s.sealed ? "lock" : "file"} size={14} />{s.sealed ? "Ciphertext" : "Readable"}
          </span>
        </div>
        <p className={`paper${s.sealed ? " sealed" : ""}`}>{s.scramble ? <Scramble text={body} duration={1300} /> : body}</p>
        {s.lines.map(([icon, text, no]) => (
          <p key={text} className={`lockline${no ? " no" : ""}`}><Icon name={icon} size={18} />{text}</p>
        ))}
      </div>
    </div>
  );
}

export default function HomePage() {
  const { refs, active } = useActiveStep(STORY.length);
  return (
    <Shell requireAuth={false}>
      <section className="hero">
        <div className="hero-copy">
          <span className="eyebrow rise">Confidential reporting</span>
          <h1>
            <SplitWords text="Speak up. *Only* *the* *committee* can listen." />
          </h1>
          <p className="lead rise" style={{ "--i": 4, maxWidth: "52ch" } as React.CSSProperties}>
            Report harassment, discrimination or a safety problem knowing it can only be read by the independent committee
            you are reporting to. Your name is optional, and stays sealed if you include it.
          </p>
          <div className="row rise" style={{ "--i": 5 } as React.CSSProperties}>
            <Link href="/report" className="btn btn-primary magnetic">File a confidential report <Icon name="arrowRight" size={18} /></Link>
            <Link href="/committee" className="btn btn-ghost magnetic">Committee inbox</Link>
          </div>
          <span className="scroll-cue rise" style={{ "--i": 6 } as React.CSSProperties} aria-hidden="true">Scroll</span>
        </div>
        <div className="parallax" style={{ justifySelf: "center" }}>
          <div className="hero-art rise" style={{ "--i": 3 } as React.CSSProperties} aria-hidden="true">
            <span className="halo" />
            <svg className="ring-text" viewBox="0 0 200 200">
              <defs><path id="ring" d="M100,100 m-88,0 a88,88 0 1,1 176,0 a88,88 0 1,1 -176,0" /></defs>
              <text><textPath href="#ring" textLength="548" lengthAdjust="spacing">Confidential · Sealed on your device · No master key · Name optional ·</textPath></text>
            </svg>
            <Image className="logo" src="/logo.png" alt="" width={240} height={240} priority />
            <span className="floater f1"><Icon name="lock" size={16} />Encrypted on your device</span>
            <span className="floater f2"><Icon name="server" size={16} />0 keys on the server</span>
          </div>
        </div>
      </section>

      <div className="marquee" aria-hidden="true">
        <div className="marquee-track">
          {[...MARQUEE, ...MARQUEE].map((t, i) => <span key={i}>{t}</span>)}
        </div>
      </div>

      <section className="section" aria-labelledby="how">
        <div className="section-head" data-reveal>
          <span className="eyebrow">How it works</span>
          <h2 id="how">Written by you. <em>Read</em> by the committee alone.</h2>
          <p className="lead">Follow a report from the moment it is written to the moment the committee reads it.</p>
        </div>
        <div className="story">
          <div className="story-stage"><Stage step={active} /></div>
          <ol className="story-steps">
            {STORY.map((s, i) => (
              <li key={s.title} ref={(el) => { refs.current[i] = el; }} data-step={i} className={`story-step${i === active ? " active" : ""}`}>
                <span className="num">0{i + 1}</span>
                <h3>{s.title}</h3>
                <p className="muted" style={{ maxWidth: "46ch" }}>{s.text}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="card card-feature" data-reveal aria-labelledby="cannot">
        <div className="grid grid-2" style={{ alignItems: "center", gap: 32 }}>
          <div className="stack" style={{ gap: 14 }}>
            <span className="eyebrow" style={{ color: "var(--aqua)" }}>Zero trust</span>
            <h2 id="cannot" style={{ fontSize: "clamp(2rem, 1.3rem + 2.4vw, 3.4rem)", lineHeight: 1 }}>Who <em>cannot</em> read your report</h2>
            <p className="muted">Not because they promise not to, but because they never hold the key.</p>
          </div>
          <ul className="checklist">
            {CANNOT.map(([icon, text]) => (
              <li key={text}><Icon name={icon} size={18} />{text}</li>
            ))}
          </ul>
        </div>
      </section>

      <section className="cta" data-reveal aria-labelledby="cta">
        <span className="eyebrow">Ready when you are</span>
        <h2 id="cta">Your voice, <em>sealed</em> until the right people read it.</h2>
        <div className="row" style={{ justifyContent: "center" }}>
          <Link href="/report" className="btn btn-primary magnetic">File a confidential report <Icon name="arrowRight" size={18} /></Link>
          <Link href="/server-view" className="btn btn-ghost magnetic">See what the server sees</Link>
        </div>
      </section>
    </Shell>
  );
}
