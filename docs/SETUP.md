# SafeVoice setup

Runs entirely on one machine: TideCloak in Docker on `localhost:8080`, the app on `localhost:3000`. Data is synthetic.

## Prerequisites

- Docker Desktop, running
- Node.js 20+ and npm
- `bash`, `curl` and `jq` (on Windows: Git Bash, plus `winget install jqlang.jq`)
- A real email address for the Tide licence, and agreement to Tide's Terms & Conditions: https://tide.org/legal

## 1. Install

```bash
npm install
```

## 2. Configure

```bash
cp .env.example .env
```

Fill in `.env` (it is gitignored, never commit it):

| Key | Value |
|---|---|
| `KC_BOOTSTRAP_ADMIN_PASSWORD` | a strong password you choose |
| `TIDE_LICENSE_EMAIL` | your licence email |
| `TIDE_TERMS_ACCEPTED` | `yes`, only if you agree to the Terms & Conditions |

## 3. Start TideCloak and create the realm

macOS / Linux:

```bash
npm run init
```

Windows (Git Bash). `npm run init` would use WSL's bash, and Git Bash has no `sudo`, so:

```bash
printf '#!/bin/sh\nexec "$@"\n' > ~/bin/sudo && chmod +x ~/bin/sudo   # pass-through, once
MSYS2_ARG_CONV_EXCL="$(pwd)/data:" bash scripts/init-tidecloak.sh
```

The script starts `tideorg/tidecloak-dev:latest`, creates the `safevoice` realm (roles `reporter`, `it-admin`, `_tide_encryptor`, `_tide_decryptor`; group `/committee`), licenses it, turns on IGA, and stops at an **invite link**. Open it and enrol the first admin's Tide account. It then writes `data/tidecloak.json`.

## 4. Run

```bash
npm run dev      # http://localhost:3000
npm test         # unit tests
```

## 5. Accounts and grants (one browser profile per account)

1. `admin2`, `admin3`, `committee1`, `reporter1` each sign in once at http://localhost:3000 to create their Tide accounts.
2. In the TideCloak admin console (http://localhost:8080/admin/safevoice/console/), raise these changes and approve them in the Tide enclave:
   - `reporter1`: roles `reporter` and `_tide_encryptor`
   - `committee1`: join group `/committee`, role `_tide_decryptor`
   - `admin1`, `admin2`, `admin3`: role `it-admin`; `admin2` and `admin3` also `tide-realm-admin`

   With three realm admins, governed changes need two approvals.
3. Everyone signs in again so their new roles reach their session.
4. As `admin1`, open **Admin** and click **Set up inbox policies**, then approve both policies in the enclave.

## 6. Use it

- **reporter1** → File a report.
- **committee1** → Committee: the reports, decrypted in the browser.
- **admin1** → What the server sees: ciphertext only.
