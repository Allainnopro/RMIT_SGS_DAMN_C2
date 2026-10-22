"use client";

import { Shell, s } from "./ui";

export default function HomePage() {
  return (
    <Shell title="SafeVoice">
      <p>
        Report harassment, discrimination or a safety problem knowing that only the independent committee can read it.
        Your report is encrypted in your browser. University IT, the platform and anyone who breaks into the server see
        only scrambled data, and nobody can add themselves to the committee without other admins approving.
      </p>
      <div style={s.card}>
        <p style={{ marginTop: 0 }}><a href="/report" style={s.navLink}>File a confidential report</a>: your name is optional and only the committee can see it.</p>
        <p><a href="/committee" style={s.navLink}>Committee</a>: read reports (committee members only).</p>
        <p style={{ marginBottom: 0 }}><a href="/server-view" style={s.navLink}>What the server sees</a> and <a href="/admin" style={s.navLink}>Admin</a>: for university IT.</p>
      </div>
    </Shell>
  );
}
