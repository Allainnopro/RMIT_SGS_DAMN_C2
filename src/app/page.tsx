"use client";

import { Icon, type IconName } from "./icons";
import { Shell } from "./ui";

const STEPS: ReadonlyArray<readonly [IconName, string, string]> = [
  ["lock", "Sealed on your device", "Your report is encrypted in your browser before it is sent, under a rule that lets reporters write and nothing more."],
  ["server", "The server holds no key", "SafeVoice stores only ciphertext. University IT, the platform and anyone who breaks in see scrambled data."],
  ["users", "Only the committee opens it", "Tide's network checks that the reader belongs to the independent committee before it helps decrypt."],
];

const CANNOT: ReadonlyArray<readonly [IconName, string]> = [
  ["server", "University IT and the platform operator"],
  ["alert", "Anyone who breaches the server"],
  ["key", "An admin who adds themselves to the committee without other admins approving"],
];

export default function HomePage() {
  return (
    <Shell requireAuth={false}>
      <section className="hero">
        <span className="eyebrow"><Icon name="shield" size={16} /> Confidential reporting</span>
        <h1>Speak up. Only the committee can listen.</h1>
        <p className="lead">
          Report harassment, discrimination or a safety problem knowing it can only be read by the independent committee
          you are reporting to. Your name is optional, and stays sealed if you include it.
        </p>
        <div className="row">
          <a href="/report" className="btn btn-primary">File a confidential report <Icon name="arrowRight" size={18} /></a>
          <a href="/committee" className="btn btn-ghost">Committee inbox</a>
        </div>
      </section>

      <section aria-labelledby="how" className="stack" style={{ marginBottom: 40 }}>
        <h2 id="how">How your report stays private</h2>
        <ol className="grid grid-3" style={{ listStyle: "none", padding: 0, margin: 0 }}>
          {STEPS.map(([icon, title, text], i) => (
            <li key={title} className="card" style={{ animationDelay: `${i * 60}ms` }}>
              <div className="card-head" style={{ marginBottom: 12 }}>
                <span className="icon-tile"><Icon name={icon} /></span>
                <span className="step-num" aria-hidden="true">{i + 1}</span>
              </div>
              <h3 style={{ marginBottom: 6 }}>{title}</h3>
              <p className="muted">{text}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="card" aria-labelledby="cannot">
        <div className="card-head">
          <span className="icon-tile"><Icon name="eyeOff" /></span>
          <div className="stack" style={{ gap: 4 }}>
            <h2 id="cannot">Who cannot read your report</h2>
            <p className="muted">Not because they promise not to, but because they never hold the key.</p>
          </div>
        </div>
        <ul className="checklist">
          {CANNOT.map(([icon, text]) => (
            <li key={text}><Icon name={icon} size={18} />{text}</li>
          ))}
        </ul>
      </section>
    </Shell>
  );
}
