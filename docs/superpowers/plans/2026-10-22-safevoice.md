# SafeVoice Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A working SafeVoice prototype (confidential reports that only the `/committee` group can decrypt, enforced by the Tide network), plus README overview and a 2-minute demo video, submitted by 18:00 GMT+7 today.

**Architecture:** Tide's `nextjs-e2ee-vault` template (login, DPoP, server-side JWT + proof checks, realm bootstrap) with the pack's `relationship-attestation/relationship.ts` helper for per-record encryption under the built-in `RelationshipAttestation:1` contract. TideCloak runs in local Docker. The Next.js server stores only ciphertext and signed policies in `data/store.json`.

**Tech Stack:** Next.js 16, React 19, TypeScript, `@tidecloak/nextjs` latest (0.14.40 on 2026-10-22; the template pins 0.14.17), `tideorg/tidecloak-dev:latest` in Docker Desktop, vitest for unit tests.

**Spec:** `docs/superpowers/specs/2026-10-22-safevoice-design.md`

## Global Constraints

- Deadline **Thu 22 Oct 2026, 18:00 GMT+7**; submit https://forms.gle/HRHYjnqB86j1LFS97 with the link to the **public** repo `Allainnopro/RMIT_SGS_DAMN_C2`.
- README **starts with** Tide's Project overview template (one-sentence description + the five prompts), **≤ 300 words**; setup lives in a separate section.
- Demo video: `.mp4` in the repo, **< 100 MB**, about 2 minutes, structure: possibility, constraint, prototype, what changes.
- Record id `safevoice-inbox`; group `/committee` (full path); realm roles `reporter`, `it-admin`, `_tide_encryptor`, `_tide_decryptor`. P1 `inbox-write` = `Role`/`reporter`/`["_tide_encryptor"]`; P2 `inbox-read` = `Group`/`/committee`/`["_tide_decryptor"]`.
- No custom Forseti contract. If policy signing fails with an unknown contract, stop and ask the Tide team (Discord https://discord.gg/XBMd9ny2q5).
- Every API route goes through `withAuth` / `withRole` from `src/lib/auth/middleware.ts`.
- Never commit `.env`, `data/tidecloak.json`, `data/store.json`, `data/keycloakdb*`, `.tide-pack/`. The licence email is never written into a committed file.
- Do not edit the template's protected files (`next.config.ts`, `public/silent-check-sso.html`, `public/tide_dpop_auth.html`, `scripts/init-tidecloak.sh`, `src/app/auth/redirect/page.tsx`, `src/app/providers.tsx`, `src/lib/auth/*`). The one sanctioned edit is `scripts/realm.json.template` (Task 1).
- Windows: run the bootstrap from Git Bash as `MSYS_NO_PATHCONV=1 bash scripts/init-tidecloak.sh` (not `npm run init`, whose `bash` resolves to WSL with no distro).
- Versions (organizer, 2026-10-22: "Latest"): image `tideorg/tidecloak-dev:latest`; `@tidecloak/nextjs` at its latest published version, matched to the running container. `public/tide_dpop_auth.html` comes from `node_modules/@tidecloak/js/` (the `tide_dpop_asset` command), never retyped and never from GitHub.
- A localhost-only prototype is accepted (organizer, 2026-10-22); judges watch the video and read the repo.
- Approval threshold is `max(1, floor(0.7 × admins))`: **3** `tide-realm-admin` accounts are needed for a 2-approval quorum.

## Review Focus

1. A corrupt `data/store.json` must raise an error, never be read as empty and then overwritten (that silently deletes every report). A missing file is an empty store. Test in Task 2.
2. A network refusal arrives as `TIDE-TIDEJS-NET-THRESHOLD_FAILURE`; the user must see "You don't have access to these reports." and nothing retries. Test in Task 3.
3. The `groups` claim carries `/committee`; a token with `committee` (no slash) or no claim at all must not pass the committee check. Test in Task 2.
4. An empty, non-string or oversized (> 1,000,000 chars) `ciphertext` must get a 400 and store nothing. Test in Task 2.
5. A junk or wrong-subject policy `PUT` must be rejected, so a working policy is never overwritten and nobody is locked out (AP-RA08). Test in Task 2.

## Team split (C2)

| Who | Tasks | Window (GMT+7) |
|---|---|---|
| **B: this computer** | 0 (with the user), 1, 2, 3, 4, 5, 6 | 11:15–16:00 |
| **C** | 7: README project overview | draft by 15:00, final by 16:30 |
| **D** | 8: video script, then recording on this machine | script by 15:30, record 16:00–16:45 |
| **A** | 9: final checks and Google Form submission; also leads C1 submissions | 17:00–17:45 |

File ownership in the C2 repo: B owns `src/`, `scripts/`, `tests/`, `docs/SETUP.md`, `docs/proof.md`, config files. C owns `README.md`. D owns `demo/`. Trunk is `main`; before every push `git pull --rebase origin main`; never `--force`. Approving this plan approves B pushing its commits to `main` after each task.

TideCloak runs on this machine only (localhost), so every Tide account action (enrolment, approvals) and the recording happen here, using separate browser profiles per account.

---

### Task 0: Machine prerequisites (the user, with B checking)

**Files:** none committed.

- [ ] **Step 1:** User finishes installing Docker Desktop and starts it. Run: `docker info --format '{{.ServerVersion}}'` → Expected: a version number, no error.
- [ ] **Step 2:** User installs jq: `winget install jqlang.jq`, then opens a new terminal. Run: `jq --version` → Expected: `jq-1.x`.
- [ ] **Step 3:** B adds a pass-through `sudo` for Git Bash (the template script calls `sudo docker`): `printf '#!/bin/sh\nexec "$@"\n' > ~/bin/sudo && chmod +x ~/bin/sudo`. Run: `sudo echo ok` in Git Bash → Expected: `ok`.

### Task 1: Scaffold, realm configuration and bootstrap

**Files:**
- Create (copied): the whole `.tide-pack/templates/nextjs-e2ee-vault/` tree into the repo root; `src/lib/tide/relationship.ts` from `.tide-pack/templates/relationship-attestation/relationship.ts`
- Modify: `package.json` (`"name": "safevoice"`), `scripts/realm.json.template`, `.gitignore`
- Keep: our `README.md` (restore it after the copy)

**Interfaces:**
- Produces: `data/tidecloak.json` (adapter with `jwk`, `vendorId`, `homeOrkUrl`); realm `safevoice`, client `safevoice-client`; realm roles `reporter`, `it-admin`; group `/committee`; `src/lib/tide/relationship.ts` exports `signRelationshipPolicy(grant, adminPolicy: Uint8Array): Promise<string>`, `encryptForRecord(data, recordId, policyB64): Promise<string>`, `decryptForRecord(encrypted, recordId, policyB64): Promise<string>`, `describeRelationshipPolicy(policyB64)`.

- [ ] **Step 1:** `cp -R .tide-pack/templates/nextjs-e2ee-vault/. ./ && git checkout -- README.md`; `mkdir -p src/lib/tide && cp .tide-pack/templates/relationship-attestation/relationship.ts src/lib/tide/`.
- [ ] **Step 2:** Set `"name": "safevoice"` in `package.json`. Ensure `.gitignore` has `.tide-pack/` and `data/store.json` in addition to the template's lines.
- [ ] **Step 3:** In `scripts/realm.json.template`, add to `roles.realm`: `{ "name": "reporter", "description": "SafeVoice: may file reports" }` and `{ "name": "it-admin", "description": "SafeVoice: university IT admin" }`. Add a top-level `"groups": [{ "name": "committee", "path": "/committee" }]`. Neither goes in the default-roles composite. Run: `node -e "JSON.parse(require('fs').readFileSync('scripts/realm.json.template','utf8').replace(/\\$\\{[A-Z_]+\\}/g,'X'))"` → Expected: no error.
- [ ] **Step 4:** `npm install @tidecloak/nextjs@latest`, then `npm ls @tidecloak/js @tideorg/js heimdall-tide`; install any that is missing at the version `@tidecloak/nextjs` depends on. Replace the DPoP page from the SDK: `cp node_modules/@tidecloak/js/tide_dpop_auth.html public/tide_dpop_auth.html && sha256sum public/tide_dpop_auth.html` → Expected: `9d7844b938f0a2565fa910d3d30e9b8797cbfd6e0b73d59d804169a089aea757`; if the hash differs, keep the SDK's copy and decide by the wire checks from `tide_dpop_asset` plus a real login (Step 8). Run: `npx tsc --noEmit` → Expected: no errors (fix `relationship.ts` imports if the newer SDK moved them).
- [ ] **Step 5:** `cp .env.example .env` and fill: `KC_BOOTSTRAP_ADMIN_PASSWORD` (generated, strong; tell the user where it is), `TIDE_LICENSE_EMAIL` (the address the user gave in chat), `TIDE_TERMS_ACCEPTED=yes` (the user agreed in chat). Run: `git check-ignore .env` → Expected: `.env`.
- [ ] **Step 6:** In Git Bash: `MSYS_NO_PATHCONV=1 bash scripts/init-tidecloak.sh`. If it fails, debug it (superpowers:systematic-debugging); do not hand-configure the realm, because IGA, licensing, mappers and roles must come from the template. When it prints the invite link, the user opens it and enrols admin #1. While they do, ask the two questions the pack requires: branding (`tide_branding`) and which new-user details to collect (`tide_onboarding`); apply both answers.
- [ ] **Step 7:** Run: `jq '{jwk: has("jwk"), vendorId: has("vendorId"), homeOrkUrl: has("homeOrkUrl")}' data/tidecloak.json` → Expected: all `true`.
- [ ] **Step 8:** Run `bash .tide-pack/templates/shared/tide-doctor.sh`, then `npm run dev` and `bash .tide-pack/templates/shared/tide-doctor.sh --url http://localhost:3000` → Expected: `RESULT: OK` both times. Then the user logs in at http://localhost:3000.
- [ ] **Step 9:** Commit `feat: scaffold SafeVoice from Tide e2ee template with committee realm` and push.

### Task 2: Store, access rules and API routes

**Files:**
- Create: `src/lib/store.ts`, `src/lib/access.ts`, `src/lib/policyCheck.ts`, `src/app/api/reports/route.ts`, `src/app/api/policies/[name]/route.ts`, `src/app/api/server-view/route.ts`, `src/app/api/admin-policy/route.ts`, `vitest.config.ts`
- Test: `tests/store.test.ts`, `tests/access.test.ts`, `tests/policyCheck.test.ts`
- Modify: `package.json` (devDependency `vitest`, script `"test": "vitest run"`)

**Interfaces:**
- Produces:
  - `store.ts`: `type PolicyName = "inbox-write" | "inbox-read"`; `interface ReportRecord { id: string; createdAt: string; ciphertext: string }`; `interface Store { reports: ReportRecord[]; policies: Partial<Record<PolicyName, string>> }`; `readStore(path?: string): Store`; `addReport(ciphertext: string, path?: string): ReportRecord`; `setPolicy(name: PolicyName, b64: string, path?: string): void`; `getPolicy(name: PolicyName, path?: string): string | null`. Default path `process.env.SAFEVOICE_STORE ?? data/store.json`.
  - `access.ts`: `INBOX_RECORD = "safevoice-inbox"`, `COMMITTEE_GROUP = "/committee"`, `REPORTER_ROLE = "reporter"`, `IT_ADMIN_ROLE = "it-admin"`, `MAX_CIPHERTEXT = 1_000_000`; `POLICY_SPEC: Record<PolicyName, { subjectType: "Role" | "Group"; subjectId: string; roles: string }>` with the values in Global Constraints (`roles` is the JSON string, e.g. `'["_tide_encryptor"]'`); `inGroup(jwt: JWTPayload, path: string): boolean`; `mayReadPolicy(jwt: JWTPayload, name: PolicyName): boolean` (`inbox-write` → `hasRole(jwt, "reporter")`, `inbox-read` → `inGroup(jwt, "/committee")`); `parseReportBody(body: unknown): { ciphertext: string } | { error: string }`.
  - `policyCheck.ts`: `checkPolicy(name: PolicyName, b64: string): string | null` — `null` when the bytes parse with `Models.Policy.from` (from `@tideorg/js`), `contractId === "RelationshipAttestation:1"`, params `subjectType`/`subjectId`/`roles` equal `POLICY_SPEC[name]`, `assignmentId === "safevoice-inbox"`, and a signature is present; otherwise a one-line error.

- [ ] **Step 1: Write the failing tests**

```ts
// tests/store.test.ts — each test uses a fresh temp dir path
test("missing store file reads as empty", () => {
  expect(readStore(tmp("none.json"))).toEqual({ reports: [], policies: {} });
});
test("addReport round-trips and leaves no temp file", () => {
  const p = tmp("s.json");
  const r = addReport("CIPHER", p);
  expect(readStore(p).reports).toEqual([r]);
  expect(r.ciphertext).toBe("CIPHER");
  expect(readdirSync(dirname(p))).toEqual(["s.json"]);
});
test("corrupt store throws instead of returning empty", () => {
  const p = tmp("bad.json"); writeFileSync(p, "{not json");
  expect(() => readStore(p)).toThrow();
  expect(() => addReport("X", p)).toThrow();
  expect(readFileSync(p, "utf8")).toBe("{not json");
});
test("setPolicy then getPolicy", () => {
  const p = tmp("p.json"); setPolicy("inbox-read", "B64", p);
  expect(getPolicy("inbox-read", p)).toBe("B64");
  expect(getPolicy("inbox-write", p)).toBeNull();
});

// tests/access.test.ts
test("committee check needs the exact full path", () => {
  expect(inGroup({ groups: ["/committee"] }, "/committee")).toBe(true);
  expect(inGroup({ groups: ["committee"] }, "/committee")).toBe(false);
  expect(inGroup({}, "/committee")).toBe(false);
});
test("each policy goes only to the subject it names", () => {
  const reporter = { realm_access: { roles: ["reporter"] } };
  const member = { groups: ["/committee"], realm_access: { roles: [] } };
  expect(mayReadPolicy(reporter, "inbox-write")).toBe(true);
  expect(mayReadPolicy(reporter, "inbox-read")).toBe(false);
  expect(mayReadPolicy(member, "inbox-read")).toBe(true);
  expect(mayReadPolicy(member, "inbox-write")).toBe(false);
});
test.each([[{}], [{ ciphertext: "" }], [{ ciphertext: 42 }], [{ ciphertext: "x".repeat(1_000_001) }], [null]])(
  "parseReportBody rejects %o", (b) => expect(parseReportBody(b)).toHaveProperty("error"));
test("parseReportBody accepts a ciphertext", () =>
  expect(parseReportBody({ ciphertext: "abc" })).toEqual({ ciphertext: "abc" }));

// tests/policyCheck.test.ts
test.each(["", "not-base64!!", "AAAA"])("checkPolicy rejects junk %s", (b64) =>
  expect(checkPolicy("inbox-read", b64)).not.toBeNull());
```

- [ ] **Step 2:** Run: `npx vitest run` → Expected: FAIL, modules not found.
- [ ] **Step 3:** Implement `store.ts` (write to `<path>.tmp` with `writeFileSync`, then `renameSync`; `readStore` returns empty only when the error code is `ENOENT`), `access.ts` (use `hasRole` from `src/lib/auth/tideJWT.ts`), `policyCheck.ts` (wrap parsing in try/catch → error string).
- [ ] **Step 4:** Run: `npx vitest run` → Expected: all pass.
- [ ] **Step 5:** Write the routes, each wrapped by the template middleware:
  - `api/reports`: `POST = withRole("reporter", …)` → `parseReportBody`, 400 on error, else `addReport` → `201 { id }`; a store error → `500 { error: "Not saved" }`. `GET = withAuth(…)` → 403 unless `inGroup(jwt, "/committee")`, else `{ reports }`.
  - `api/policies/[name]`: unknown name → 404. `GET = withAuth(…)` → 403 unless `mayReadPolicy`; 404 `{ error: "not set up" }` when no policy stored; else `{ policy }`. `PUT = withRole("it-admin", …)` → `checkPolicy`, 400 with its message on failure, else `setPolicy` → 204.
  - `api/server-view`: `GET = withRole("it-admin", …)` → the raw `readStore()`.
  - `api/admin-policy`: `GET = withRole("it-admin", …)` → server-side `fetch` of `{auth-server-url}/admin/realms/safevoice/iga/role-policies/name/tide-realm-admin` with the caller's bearer token; return `{ policy }` (field `policy`, base64), or pass the upstream status through.
- [ ] **Step 6:** Run: `npx tsc --noEmit && npx vitest run` → Expected: no type errors; all tests pass. With `npm run dev` up, `curl -s -o /dev/null -w "%{http_code}" -X POST localhost:3000/api/reports` → Expected: `401`.
- [ ] **Step 7:** Commit `feat: ciphertext store, access rules and protected API routes` and push.

### Task 3: Reporter page and Tide error messages

**Files:**
- Create: `src/lib/tideErrors.ts`, `src/app/report/page.tsx`
- Test: `tests/tideErrors.test.ts`
- Modify: `src/app/page.tsx` (landing text and links to `/report`, `/committee`, `/server-view`, `/admin`)

**Interfaces:**
- Consumes: `encryptForRecord` (Task 1), `INBOX_RECORD` (Task 2), `GET /api/policies/inbox-write`, `POST /api/reports`.
- Produces: `describeTideError(err: unknown): string`.

- [ ] **Step 1: Write the failing test**

```ts
test.each([
  "TIDE-TIDEJS-NET-THRESHOLD_FAILURE: Could not reach enough VVK ORKs (got 0 of 5 required)",
  "'/committee' group not found in doken.",
  "_tide_decryptor not found in list of roles.",
  "subjectId does not match. a <> b",
])("refusal %s reads as no access", (m) =>
  expect(describeTideError(new Error(m))).toBe("You don't have access to these reports."));
test("anything else is shown as-is", () =>
  expect(describeTideError(new Error("boom"))).toBe("boom"));
```

- [ ] **Step 2:** Run: `npx vitest run tests/tideErrors.test.ts` → Expected: FAIL, module not found.
- [ ] **Step 3:** Implement `describeTideError`: check the message, and `err.cause` when present, for `THRESHOLD_FAILURE`, `not found in doken`, `not found in list of roles`, `subjectId does not match`, `Tags do not contain assignmentId`.
- [ ] **Step 4:** Run: `npx vitest run` → Expected: all pass.
- [ ] **Step 5:** Build `/report`. Fields: category (`Harassment`, `Discrimination`, `Safety hazard`, `Misconduct`, `Other`), what happened (textarea, any language), when, where, checkbox "Include my name and contact", with name and contact fields shown only when ticked. On submit:
  1. Fetch the `inbox-write` policy, calling the API the way `src/app/vault/page.tsx` does (`Authorization: Bearer ${token}`).
  2. Encrypt `JSON.stringify({ category, description, when, where, contact? })` with `encryptForRecord(…, INBOX_RECORD, policy)`.
  3. POST `{ ciphertext }`; show the receipt id.
  4. On any failure, show the error (via `describeTideError` for Tide errors) and keep the typed text. A 404 on the policy shows "SafeVoice isn't set up yet: an admin must approve the inbox policies."
- [ ] **Step 6:** Run: `npx tsc --noEmit` → Expected: no errors. Commit `feat: reporter page encrypts reports into the inbox` and push.

### Task 4: Committee, server-view and admin pages

**Files:**
- Create: `src/app/committee/page.tsx`, `src/app/server-view/page.tsx`, `src/app/admin/page.tsx`

**Interfaces:**
- Consumes: `decryptForRecord`, `signRelationshipPolicy` (Task 1); `describeTideError` (Task 3); the Task 2 routes; `vendorId` from `GET /api/config` (template route).

- [ ] **Step 1:** `/committee`: fetch `inbox-read` and `GET /api/reports`; decrypt each report in the browser with `decryptForRecord(r.ciphertext, INBOX_RECORD, policy)`; render newest first (category, description, when, where, contact or "Anonymous to the committee: no name given"). A failed decrypt shows `describeTideError` on that card. A 403 shows "This page is for committee members."
- [ ] **Step 2:** `/server-view`: render `GET /api/server-view` as formatted JSON under the heading "What the server sees", with one line: "No key on this server can turn these back into reports."
- [ ] **Step 3:** `/admin`: a button "Set up inbox policies". It fetches `GET /api/admin-policy` (base64 → `Uint8Array`), then for P1 and P2 calls `signRelationshipPolicy({ vendorId, subject, recordId: INBOX_RECORD, access }, adminPolicy)` with subject `{ type: "Role", id: "reporter" }` / access `"write"` and subject `{ type: "Group", id: "/committee" }` / access `"read"`. Each opens one enclave approval. `PUT` each result to `/api/policies/inbox-write` and `/api/policies/inbox-read`, and show what `describeRelationshipPolicy` reports for both. Add a link to `http://localhost:8080/admin/safevoice/console/` labelled "Change requests (committee membership needs a quorum)".
- [ ] **Step 4:** Run: `npx tsc --noEmit && npx vitest run` → Expected: clean. Commit `feat: committee, server-view and admin pages` and push.

### Task 5: Accounts, grants and live proof

**Files:**
- Create: `docs/proof.md` (each check, what the network returned, pass/fail)

- [ ] **Step 1:** In separate browser profiles, these accounts each sign in once at http://localhost:3000 and enrol a Tide account: `admin2`, `admin3`, `committee1`, `reporter1` (`admin1` exists from Task 1).
- [ ] **Step 2:** In the TideCloak admin console, raise and approve change requests in the enclave:
  - `reporter1`: `reporter` + `_tide_encryptor`
  - `committee1`: join `/committee` + `_tide_decryptor`
  - `admin1`, `admin2`, `admin3`: `it-admin`; `admin2` and `admin3`: also `tide-realm-admin`

  Approve any `REGEN_ADMIN_POLICY` request that appears. Each user signs in again afterwards.
- [ ] **Step 3:** As `admin1`, run "Set up inbox policies" on `/admin` (2 enclave approvals). Expected: both policies show `isRelationshipPolicy: true`, `signed: true`. If signing fails with an unknown contract, stop (Global Constraints).
- [ ] **Step 4:** Run the live checks and record each in `docs/proof.md`:
  1. As `reporter1`, file a report written in Vietnamese with contact details, and one in English without. Receipts appear.
  2. As `admin1`, `/server-view` shows ciphertext only.
  3. As `committee1`, `/committee` shows both reports, decrypted, with the Vietnamese text intact.
  4. As `reporter1`, open `/committee`: the page shows the 403 message.
  5. In the browser console, `decryptForRecord` with the `inbox-write` policy is refused by the network (shown as "You don't have access to these reports.").
  6. As `admin2`, request adding `admin2` to `/committee`: the change request shows it needs a second approval. `admin3` declines it, and `admin2` still cannot open `/committee`.
- [ ] **Step 5:** If check 6 shows a threshold of 1, approve the pending `REGEN_ADMIN_POLICY` and repeat. If it still shows 1 at 15:30, record that in `docs/proof.md` and narrate the pending request in the video instead of the decline.
- [ ] **Step 6:** Commit `docs: live proof of the SafeVoice refusals` and push.

### Task 6: Doctor, setup guide and code freeze

**Files:**
- Create: `docs/SETUP.md` (prerequisites, `.env` keys without values, the Git Bash init command, the accounts and grants from Task 5, `npm run dev`, `npx vitest run`)

- [ ] **Step 1:** Run `bash .tide-pack/templates/shared/tide-doctor.sh` and `bash .tide-pack/templates/shared/tide-doctor.sh --url http://localhost:3000` → Expected: `RESULT: OK` both. Run `npx vitest run` → all pass.
- [ ] **Step 2:** Run `git ls-files | grep -E "\.env$|tidecloak\.json|store\.json|keycloakdb|\.tide-pack"` → Expected: no output. Run `(set -a; . ./.env; git grep -nF "$TIDE_LICENSE_EMAIL")` → Expected: no output (the licence email appears in no tracked file).
- [ ] **Step 3:** Commit `docs: setup guide`, tag `c2-freeze`, push with `--tags`. Tell C and D the app is frozen for recording.

### Task 7 (C): README project overview

**Files:** Modify: `README.md` (C is the only writer)

- [ ] **Step 1:** Copy the organizer's template to the top of `README.md`: the badge line and headings from https://github.com/truongnguyenxuanvinh/hackathon/blob/main/README.md (same as the "Copy README template" button at https://tide.org/unlocked#req-repo). Add the one-sentence description and answer the five prompts from spec §2 and §9: Vision & originality, Trust constraint insight, Value & impact, Why TideCloak matters, Prototype & storytelling.
- [ ] **Step 2:** Below the overview add `## Setup` with one line linking to `docs/SETUP.md`, and `## Demo video` linking to `demo/safevoice-demo.mp4`.
- [ ] **Step 3:** Count the overview's words (everything above `## Setup`). Expected: ≤ 300. Commit `docs: README project overview` and push.

### Task 8 (D): Demo video

**Files:** Create: `demo/script.md`, `demo/safevoice-demo.mp4`

- [ ] **Step 1:** Write `demo/script.md`: 2 minutes, about 260 spoken words, in four parts (possibility, constraint, prototype, what changes). The prototype part follows Task 5 checks 1, 2, 3, 6 and 5, in that order.
- [ ] **Step 2:** After the `c2-freeze` tag, record on this machine with the Windows Snipping Tool screen recorder (Win+Shift+R, saves `.mp4`), narrating the script. Trim to ≤ 2:10.
- [ ] **Step 3:** Save as `demo/safevoice-demo.mp4`. Run: `ls -l demo/safevoice-demo.mp4` → Expected: under 100 MB (104,857,600 bytes). Commit `docs: demo video` and push.

### Task 9 (A): Final checks and submission

- [ ] **Step 1:** On https://github.com/Allainnopro/RMIT_SGS_DAMN_C2, confirm: public; README opens with the overview; `demo/safevoice-demo.mp4` plays; no `.env` or `tidecloak.json` in the file list.
- [ ] **Step 2:** Submit the repo link through https://forms.gle/HRHYjnqB86j1LFS97 by **17:45**. Post the confirmation in the team chat.
