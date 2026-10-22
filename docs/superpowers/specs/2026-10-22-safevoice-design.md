# SafeVoice — Design Spec (RMIT Hackathon 2026, Challenge 2 "UNLOCKED")

**Date:** 2026-10-22 · **Team:** RMIT_SGS_DAMN · **Repo:** https://github.com/Allainnopro/RMIT_SGS_DAMN_C2 (public)

## 1. The challenge (from https://tide.org/unlocked)

- Build a small **working** prototype with **TideCloak integrated**, where no single administrator, organisation or AI can unilaterally override the rules protecting people's data and decisions. Demonstrate one new possibility and explain why removing unilateral control makes it possible.
- **Deadline: Thu 22 Oct 2026, 18:00 Vietnam time** (same as Kaggle Challenge 1). Submit the repo link through the Google Form: https://forms.gle/HRHYjnqB86j1LFS97
- **Deliverables, both in this public repo:**
  1. The prototype code, with a README that **starts with the Project overview template** from the challenge page: a one-sentence description plus answers to the five prompts (Vision & originality, Trust constraint insight, Value & impact, Why TideCloak matters, Prototype & storytelling). **≤ 300 words.** Setup instructions go in a separate section.
  2. A **two-minute demo video** as an `.mp4` in the repo, **under 100 MB**. Suggested structure: the possibility, the constraint, the prototype (working, with TideCloak's role shown), what changes.
- **Judging:** Vision & originality 25%, Trust constraint insight 20%, Value & impact 20%, Why TideCloak matters 20%, Prototype & storytelling 15%.
- **Avoid:** a project that is mainly a login demo, a security tool or a generic access-control dashboard. "If your app would work exactly the same with ordinary login and backend permissions, develop the idea further."
- Synthetic data and mocked systems are expected.

## 2. The idea

**SafeVoice: harassment and safety reports that only an independent committee can open.**

- **The possibility:** students and staff report harassment, misconduct or safety problems knowing that the university's IT staff, the platform operator and anyone who breaks into the server cannot read the report, and that nobody can quietly add themselves to the people who can.
- **The trust constraint today:** reporting tools run on servers that their operator can read. Whoever administers the system (often the same institution the report is about) can read reports, see who filed them, or grant themselves access. Fear of exposure and retaliation keeps people from reporting.
- **What TideCloak changes:** reports are encrypted in the reporter's browser under a policy that the Tide network enforces at decryption. Only members of the `/committee` group can decrypt. The server holds only ciphertext and holds no key. Changing who is on the committee is a governed change that needs more than one admin's approval, so no single admin can let themselves in.
- **Anonymity: confidential, with the name optional.** The reporter signs in, so the server knows that an account filed a report, but never what it says. Inside the encrypted report the reporter chooses whether to include their name and contact details. Only the committee can read them.

## 3. Actors

| Actor | How they are set up | Can | Cannot |
|---|---|---|---|
| Reporter (student or staff) | realm role `reporter` + realm role `_tide_encryptor` | encrypt a report into the inbox | read any report, including their own after submitting |
| Committee member (3 synthetic) | member of group `/committee` + realm role `_tide_decryptor` | decrypt and read every report | write or forge reports |
| University IT admin (2 synthetic) | realm role `it-admin` (app access) + `tide-realm-admin` (enclave approvals) | approve setup and governance changes in the Tide enclave | read reports; join the committee without a second admin's approval |
| The server | Next.js API routes + `data/store.json` | store and return ciphertext | decrypt anything (it has no key and no user credential) |

## 4. Policies (built-in contract `RelationshipAttestation:1`, no custom contract)

One record, id **`safevoice-inbox`**. Every report item is tagged with exactly `["safevoice-inbox"]`.

| Policy | `subjectType` | `subjectId` | `assignmentId` | `roles` (JSON string) |
|---|---|---|---|---|
| P1 `inbox-write` | `Role` | `reporter` | `safevoice-inbox` | `["_tide_encryptor"]` |
| P2 `inbox-read` | `Group` | `/committee` (full path) | `safevoice-inbox` | `["_tide_decryptor"]` |

- Both are signed once at setup, in an admin's browser, with enclave approval. The server stores the signed bytes.
- Policy version comes from `Models.Policy.latestVersion`, never hard-coded.
- `_tide_encryptor` / `_tide_decryptor` are **realm** roles, granted per user (not default roles).
- IGA stays on. Every redirect URI and web origin is registered before `tide-realm-admin` is granted (that grant is one-way).

## 5. Screens

| Route | Who | What |
|---|---|---|
| `/` | everyone | what SafeVoice is; sign in |
| `/report` | reporter | form: category, what happened (free text, any language), when and where, optional "include my name and contact" fields. Encrypts in the browser, submits ciphertext, shows a receipt id |
| `/committee` | committee | list of reports, decrypted in the browser, newest first |
| `/server-view` | IT admin | "What the server sees": the raw stored records, ciphertext only. This is the trust demonstration |
| `/admin` | IT admin | one-time "set up inbox policies" (builds P1 and P2, enclave approval, stores them); link to TideCloak's change-request approvals |

## 6. APIs

Every route goes through the template's `withAuth` / `withRole` wrapper, which verifies the JWT **and** the DPoP proof on the server. A UI check is never the authorisation.

| Route | Allowed | Behaviour |
|---|---|---|
| `POST /api/reports` | role `reporter` | body `{ ciphertext }`; stores `{ id, createdAt, ciphertext }`; returns `{ id }`. Stores no plaintext field |
| `GET /api/reports` | group `/committee` | returns all stored reports (ciphertext) |
| `GET /api/policies/inbox-write` | role `reporter` | signed P1 bytes |
| `GET /api/policies/inbox-read` | group `/committee` | signed P2 bytes |
| `PUT /api/policies/:name` | role `it-admin` | stores signed policy bytes after checking they parse and name the expected record and subject |
| `GET /api/server-view` | role `it-admin` | the raw store |

**Storage:** `data/store.json` (gitignored), shape `{ reports: [...], policies: { "inbox-write": "...", "inbox-read": "..." } }`. Writes go to a temp file, then rename, so a crash mid-write cannot corrupt the store.

## 7. Errors

| Situation | What the user sees |
|---|---|
| Tide network refuses (surfaces as `TIDE-TIDEJS-NET-THRESHOLD_FAILURE`, with the contract's message in `cause`) | "You don't have access to these reports." No retry |
| Policy not stored yet | "SafeVoice isn't set up yet: an admin must approve the inbox policies." |
| 401 from an API | sent back to sign in |
| 403 from an API | "This page is for committee members." (or the matching role) |
| Store write fails | the report is not acknowledged; the reporter sees "Not saved, please try again" and keeps their text |

## 8. Setup prerequisites (asked at implementation time, answered only by the user)

- Docker Desktop installed and running on this machine (local Docker hosting, chosen 2026-10-22).
- Tide licence email and agreement to Tide's Terms & Conditions (https://tide.org/legal), passed as `TIDE_LICENSE_EMAIL` and `TIDE_TERMS_ACCEPTED=yes`.
- `KC_BOOTSTRAP_ADMIN_PASSWORD` in `.env` (gitignored), never in a script.
- Synthetic Tide accounts enrolled in the enclave: 2 admins, 3 committee members, 2 reporters (several can be the same person in separate browser profiles).

## 9. Proof that it works

1. `tide-doctor.sh` reports `RESULT: OK`, then again with `--url http://localhost:3000`, then a real login.
2. Unit tests for the store (round trip; atomic write leaves the old file intact on failure) and for the API role checks (a reporter gets 403 on `GET /api/reports`).
3. Live checks, all shown in the video:
   - a reporter submits a report in Vietnamese; `/server-view` shows only ciphertext;
   - a committee member reads it, decrypted;
   - a reporter calling the committee policy, or decrypting directly, is refused by the network;
   - an IT admin's change request to join `/committee` waits for a second approval, which is declined, so they stay out.

## 10. Out of scope

Committee replies to reporters; per-report revocation; fully anonymous submission; custom Forseti contracts (deployment needs the Tide team); hosted Skycloak; production hardening.

## 11. Risks

| Risk | Mitigation |
|---|---|
| Docker Desktop install takes long or needs a restart | start it first; nothing else waits on a restart except TideCloak |
| The local network lacks `RelationshipAttestation:1` (ASSUMED present for networks updated since 2026-10-16) | if policy signing fails with an unknown contract, stop and ask the Tide team on Discord; do not write a custom contract |
| Enrolling several Tide accounts is slow | enrol them while the app is being built; use separate browser profiles |
| The same 18:00 deadline as Kaggle C1 | the C1 pipeline runs in its own session; README and video work can go to teammates |
