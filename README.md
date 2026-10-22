[![Built with TideCloak](https://tide.org/badges/built-with-tidecloak.svg)](https://tide.org/tidecloak?utm_source=github&utm_medium=readme&utm_campaign=unlocked)

## Project overview

SafeVoice lets students and staff report harassment or safety problems so that only an independent committee can ever read them.

Built with [TideCloak](https://tide.org/tidecloak?utm_source=github&utm_medium=readme&utm_campaign=unlocked).

### 1. Vision & originality

A reporting channel whose confidentiality does not depend on trusting the institution that runs it. Reports are sealed for a committee, not for a server, and nobody can quietly change who is on that committee.

### 2. Trust constraint insight

Today, whoever administers a reporting system can read every report, see who filed it, or give themselves access. That administrator often works for the institution the report is about. Fear of exposure is a main reason people never report. Remove that single point of control and reporting becomes safe enough to use.

### 3. Value & impact

A student harassed by a staff member can report it knowing that university IT, faculty leadership and anyone breaking into the server see only scrambled data. They choose whether to include their name. More reports reach people who can act, sooner.

### 4. Why TideCloak matters

Each report is encrypted in the reporter's browser under a TideCloak policy (built-in `RelationshipAttestation:1`): reporters may only write to the inbox, and only `/committee` members may decrypt it. Tide's threshold network enforces this at decryption, so our server never holds a key. Committee changes are TideCloak change requests needing an admin quorum, so no single admin can let themselves in.

### 5. Prototype & storytelling

Tide's network was overloaded during the hackathon, so, per Tide's Plan C, the demo simulates TideCloak's sign-in, roles and threshold network; the server enforces the same rules. Watch a report sealed in the reporter's browser, the server seeing only ciphertext, and the committee opening it. An IT admin who proposes adding themselves stays locked out until a second admin approves.

## How the Plan C simulation maps to TideCloak

| Live TideCloak (code in this repo) | Plan C simulation (`NEXT_PUBLIC_TIDE_MODE=simulated`) |
|---|---|
| Tide sign-in; DPoP-bound JWTs verified by `src/lib/auth/` | Persona picker; an HMAC-signed session the server verifies, carrying the same role and group claims |
| Inbox policies signed on Tide's network; `encryptForRecord` / `decryptForRecord` in `src/lib/tide/relationship.ts` | Reports AES-GCM sealed in the browser; each report key is wrapped for a simulated network that unwraps it only for `/committee` members (`src/app/vault.ts`, `src/app/api/sim/network`) |
| IGA change requests approved in the Tide enclave | Committee changes need 2 of 3 IT admins (`src/lib/sim.ts`, tested in `tests/sim.test.ts`) |

Every API route keeps its role and group checks in both modes. Only who vouches for the identity changes.

## Quick start (simulated, no TideCloak needed)

```bash
npm install
mkdir -p data
cp scripts/tidecloak.placeholder.json data/tidecloak.json   # only if you have no real adapter file
echo NEXT_PUBLIC_TIDE_MODE=simulated > .env.local
npm run dev
```

Open http://localhost:3000, click **Sign in** and pick a persona:

1. **reporter1** files a report.
2. **admin1** opens *Server view* (ciphertext only) and *Committee* (refused). On *Admin*, propose adding admin1 to the committee and approve: 1 of 2, still refused.
3. **admin2** approves: the change applies.
4. **committee1** opens *Committee* and reads the report, decrypted in the browser.

Run the tests with `npm test`.

## Live TideCloak

Leave `NEXT_PUBLIC_TIDE_MODE` unset and follow [docs/SETUP.md](docs/SETUP.md). The live integration (Tide sign-in, DPoP, account linking, enclave approvals, signed inbox policies) is built. During the hackathon Tide's network failed at policy signing, which is why the demo uses Plan C.

## Demo video

[demo/safevoice-demo.mp4](demo/safevoice-demo.mp4)
