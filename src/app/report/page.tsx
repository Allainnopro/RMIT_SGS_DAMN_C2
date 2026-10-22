"use client";

import { useState } from "react";
import { describeTideError } from "@/lib/tideErrors";
import { Icon } from "../icons";
import { Alert, api, Shell } from "../ui";
import { sealer } from "../vault";

const CATEGORIES = ["Harassment", "Discrimination", "Safety hazard", "Misconduct", "Other"];
const MAX_DESCRIPTION = 10_000; // keeps the encrypted report well under the server's size limit

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
  const [copied, setCopied] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const seal = await sealer();
      const report = { category, description, when, where, ...(withContact ? { contact: { name, contact } } : {}) };
      const ciphertext = await seal(JSON.stringify(report));

      const r = await api<{ id?: string; error?: string }>("/api/reports", { method: "POST", body: JSON.stringify({ ciphertext }) });
      if (r.status !== 201 || !r.data.id) throw new Error("Not saved, please try again.");
      setReceipt(r.data.id);
      setCopied(false);
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

  async function copyReceipt() {
    try {
      await navigator.clipboard.writeText(receipt);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  }

  if (receipt) {
    return (
      <Shell title="Report received">
        <section className="card card-feature stack rise" style={{ maxWidth: 640 }}>
          <div className="card-head" style={{ marginBottom: 0 }}>
            <span className="icon-tile"><Icon name="check" /></span>
            <div className="stack" style={{ gap: 4 }}>
              <h2>Sent to the committee</h2>
              <p className="muted">It was encrypted on this device. Only committee members can open it.</p>
            </div>
          </div>
          <div className="field">
            <span className="label">Your receipt number</span>
            <div className="receipt">
              <code>{receipt}</code>
              <button type="button" onClick={copyReceipt} className="icon-btn" aria-label="Copy receipt number">
                <Icon name={copied ? "check" : "copy"} size={18} />
              </button>
            </div>
            <p className="help" aria-live="polite">{copied ? "Copied." : "Keep it if you want to refer to this report later."}</p>
          </div>
          <ul className="checklist">
            <li><Icon name="lock" size={18} />Not even you can open this report again: reporters can only write.</li>
            <li><Icon name="users" size={18} />The committee reviews new reports and contacts you only if you left details.</li>
          </ul>
          <div><button type="button" onClick={() => setReceipt("")} className="btn btn-ghost">File another report</button></div>
        </section>
      </Shell>
    );
  }

  return (
    <Shell
      title="File a confidential report"
      eyebrow="Reporter"
      intro="Tell the committee what happened, in any language. Only the independent committee can read it."
    >
      <form onSubmit={submit} className="card form rise" style={{ maxWidth: 760, "--i": 1 } as React.CSSProperties} aria-busy={busy}>
        <Alert kind="info">
          Encrypted on this device before it is sent. University IT, the platform and the server only ever see scrambled data.
        </Alert>

        <fieldset>
          <legend className="label">What kind of problem is it?</legend>
          <div className="chips">
            {CATEGORIES.map((c) => (
              <label key={c} className="chip">
                <input type="radio" name="category" value={c} checked={category === c} onChange={() => setCategory(c)} />
                <span>{c}</span>
              </label>
            ))}
          </div>
        </fieldset>

        <div className="field">
          <label htmlFor="description" className="label">What happened</label>
          <textarea
            id="description"
            required
            maxLength={MAX_DESCRIPTION}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="input"
            aria-describedby="description-help"
            placeholder="Describe what happened, who was involved and anything the committee should know."
          />
          <div className="field-foot">
            <span id="description-help" className="help">Write in whichever language you are most comfortable with.</span>
            <span className="help" aria-hidden="true">{description.length.toLocaleString()} / {MAX_DESCRIPTION.toLocaleString()}</span>
          </div>
        </div>

        <div className="grid grid-2">
          <div className="field">
            <label htmlFor="when" className="label">When <span className="optional">(optional)</span></label>
            <input id="when" value={when} onChange={(e) => setWhen(e.target.value)} className="input" placeholder="e.g. Tuesday afternoon, week 8" />
          </div>
          <div className="field">
            <label htmlFor="where" className="label">Where <span className="optional">(optional)</span></label>
            <input id="where" value={where} onChange={(e) => setWhere(e.target.value)} className="input" placeholder="e.g. Building 2, level 3 lab" />
          </div>
        </div>

        <div className="stack" style={{ gap: 12 }}>
          <label className="switch">
            <input type="checkbox" checked={withContact} onChange={(e) => setWithContact(e.target.checked)} />
            <span className="switch-track" aria-hidden="true" />
            <span>
              <span className="label">Include my name and contact details</span>
              <span className="help" style={{ display: "block" }}>Off by default. If you include them, they are sealed inside the report and only the committee sees them.</span>
            </span>
          </label>
          {withContact && (
            <div className="reveal grid grid-2">
              <div className="field">
                <label htmlFor="name" className="label">Name</label>
                <input id="name" value={name} onChange={(e) => setName(e.target.value)} className="input" autoComplete="name" />
              </div>
              <div className="field">
                <label htmlFor="contact" className="label">Email or phone</label>
                <input id="contact" value={contact} onChange={(e) => setContact(e.target.value)} className="input" autoComplete="email" />
              </div>
            </div>
          )}
        </div>

        {error && <Alert kind="error">{error}</Alert>}

        <div className="row" style={{ justifyContent: "space-between" }}>
          <p className="help" style={{ display: "inline-flex", alignItems: "center", gap: 6 }}><Icon name="shield" size={16} />Protected by TideCloak</p>
          <button type="submit" disabled={busy || !description.trim()} className="btn btn-primary magnetic">
            {busy ? <><span className="spinner" aria-hidden="true" />Encrypting and sending…</> : <><Icon name="send" size={18} />Encrypt and send</>}
          </button>
        </div>
      </form>
    </Shell>
  );
}
