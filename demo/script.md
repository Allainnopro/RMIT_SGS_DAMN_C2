# SafeVoice demo video script (2 minutes)

Record on the demo machine with the Windows Snipping Tool screen recorder (Win+Shift+R). Use separate browser profiles: **reporter1**, **committee1**, **admin1**, **admin2**. Keep each shot short; narration is about 260 words.

## 1. The possibility (0:00–0:20)

**Screen:** SafeVoice home page.

> This is SafeVoice. A student or staff member can report harassment or a safety problem, knowing that only an independent committee will ever read it. Not university IT, not the people who run the platform, and not anyone who breaks into the server.

## 2. The constraint (0:20–0:40)

**Screen:** stay on the home page.

> Today, whoever administers a reporting system can read every report, see who sent it, and give themselves access. That administrator usually works for the institution the report is about. So people stay silent.

## 3. The prototype (0:40–1:40)

**Screen:** reporter1 → File a report. Type a report in Vietnamese, tick "Include my name", send. Show the receipt.

> A reporter writes in their own language. The report is encrypted right here in the browser, under a TideCloak policy that lets reporters write to the inbox and nothing more.

**Screen:** admin1 → What the server sees.

> This is everything our server holds: ciphertext. There is no key here.

**Screen:** committee1 → Committee. The report appears decrypted, Vietnamese intact, with the name.

> A committee member opens it. Tide's network checked that they belong to the committee group before helping decrypt.

**Screen:** reporter1 → Committee. The page refuses.

> The reporter can't read reports, not even their own: the network refuses.

**Screen:** admin2 in the TideCloak console requests to add admin2 to /committee. Show it waiting for approval; admin3 declines.

> And an IT admin who tries to join the committee needs other admins to approve. Here they say no.

## 4. What changes (1:40–2:00)

**Screen:** home page.

> With TideCloak, confidentiality no longer depends on trusting whoever runs the system. People can speak up safely, and committees hear about problems sooner.
