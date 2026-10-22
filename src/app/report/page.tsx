"use client";

import { useState } from "react";
import { INBOX_RECORD } from "@/lib/constants";
import { encryptForRecord } from "@/lib/tide/relationship";
import { describeTideError } from "@/lib/tideErrors";
import { api, Shell, s } from "../ui";

const CATEGORIES = ["Harassment", "Discrimination", "Safety hazard", "Misconduct", "Other"];
const NOT_SET_UP = "SafeVoice isn't set up yet: an admin must approve the inbox policies.";

export default function ReportPage() {
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [description, setDescription] = useState("");
  const [when, setWhen] = useState("");
  const [where, setWhere] = useState("");
  const [withContact, setWithContact] = useState(false);
  const [name, setName] = useState("");
  const [contact, setContact] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [receipt, setReceipt] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    setReceipt("");
    try {
      const p = await api<{ policy?: string; error?: string }>("/api/policies/inbox-write");
      if (p.status === 404) throw new Error(NOT_SET_UP);
      if (p.status === 403) throw new Error("Your account can't file reports yet: it needs the reporter role.");
      if (p.status !== 200 || !p.data.policy) throw new Error(p.data.error ?? `Could not load the inbox policy (${p.status}).`);

      const report = { category, description, when, where, ...(withContact ? { contact: { name, contact } } : {}) };
      const ciphertext = await encryptForRecord(JSON.stringify(report), INBOX_RECORD, p.data.policy);

      const r = await api<{ id?: string; error?: string }>("/api/reports", { method: "POST", body: JSON.stringify({ ciphertext }) });
      if (r.status !== 201 || !r.data.id) throw new Error("Not saved, please try again.");
      setReceipt(r.data.id);
      setDescription("");
      setWhen("");
      setWhere("");
      setName("");
      setContact("");
    } catch (err) {
      setError(describeTideError(err)); // the typed report stays in the form
    } finally {
      setBusy(false);
    }
  }

  return (
    <Shell title="File a confidential report">
      <p style={s.muted}>
        Encrypted in this browser before it is sent. Only members of the independent committee can open it; the server
        and university IT cannot. Write in any language.
      </p>
      <form onSubmit={submit} style={s.card}>
        <label htmlFor="category" style={s.label}>Category</label>
        <select id="category" value={category} onChange={(e) => setCategory(e.target.value)} style={s.input}>
          {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
        </select>

        <label htmlFor="description" style={s.label}>What happened</label>
        <textarea id="description" required rows={6} value={description} onChange={(e) => setDescription(e.target.value)} style={s.input} />

        <label htmlFor="when" style={s.label}>When</label>
        <input id="when" value={when} onChange={(e) => setWhen(e.target.value)} style={s.input} placeholder="e.g. Tuesday afternoon, week 8" />

        <label htmlFor="where" style={s.label}>Where</label>
        <input id="where" value={where} onChange={(e) => setWhere(e.target.value)} style={s.input} placeholder="e.g. Building 2, level 3 lab" />

        <label style={{ ...s.label, fontWeight: 400 }}>
          <input type="checkbox" checked={withContact} onChange={(e) => setWithContact(e.target.checked)} /> Include my name and contact details (only the committee will see them)
        </label>
        {withContact && (
          <>
            <label htmlFor="name" style={s.label}>Name</label>
            <input id="name" value={name} onChange={(e) => setName(e.target.value)} style={s.input} />
            <label htmlFor="contact" style={s.label}>Email or phone</label>
            <input id="contact" value={contact} onChange={(e) => setContact(e.target.value)} style={s.input} />
          </>
        )}

        <p><button type="submit" disabled={busy} style={s.btn}>{busy ? "Encrypting and sending…" : "Encrypt and send"}</button></p>
        <div aria-live="polite">
          {error && <p role="alert" style={s.error}>{error}</p>}
          {receipt && <p style={s.ok}>Received. Your receipt number is <strong>{receipt}</strong>. Keep it if you want to refer to this report.</p>}
        </div>
      </form>
    </Shell>
  );
}
