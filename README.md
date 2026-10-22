[![Built with TideCloak](https://tide.org/badges/built-with-tidecloak.svg)](https://tide.org/tidecloak?utm_source=github&utm_medium=readme&utm_campaign=unlocked)

## Project overview

SafeVoice lets students and staff report harassment or safety problems so that only an independent committee can ever read them.

Built with [TideCloak](https://tide.org/tidecloak?utm_source=github&utm_medium=readme&utm_campaign=unlocked).

### 1. Vision & originality

A reporting channel whose confidentiality does not depend on trusting the institution that runs it. Reports are sealed for a committee, not for a server, and nobody can quietly change who is on that committee.

### 2. Trust constraint insight

Today, whoever administers a reporting system can read every report, see who filed it, or give themselves access. That administrator often works for the institution the report is about. Fear of exposure is a main reason people never report. Remove that single point of control and reporting becomes safe enough to use.

### 3. Value & impact

A student harassed by a staff member can report it knowing that university IT, faculty leadership and anyone who breaks into the server see only scrambled data. They decide whether to include their name. More reports reach the people who can act, sooner.

### 4. Why TideCloak matters

Each report is encrypted in the reporter's browser under a TideCloak policy using the built-in `RelationshipAttestation:1` contract. Reporters may only write to the inbox; only members of the `/committee` group may decrypt it. Tide's network enforces this at decryption, so our server holds no key. Changing committee membership is a TideCloak change request that needs a quorum of admins, so no single admin can let themselves in.

### 5. Prototype & storytelling

Watch a report written in Vietnamese travel from a reporter's browser to the committee's, while "What the server sees" shows only ciphertext. A reporter trying to read reports is refused by the network, and an IT admin's request to join the committee waits for approvals that never come.

## Setup

See [docs/SETUP.md](docs/SETUP.md).

## Demo video

[demo/safevoice-demo.mp4](demo/safevoice-demo.mp4)
