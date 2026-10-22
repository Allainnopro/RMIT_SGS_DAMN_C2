# SafeVoice demo video script (2 minutes, Plan C)

Record with the Windows Snipping Tool screen recorder (Win+Shift+R) at 1920×1080, in Edge at http://localhost:3000. One browser is enough: switch account with **Sign out**, then **Sign in**. The demo accounts' password is `SIM_DEMO_PASSWORD` in the local `.env` file. Narration is about 250 words; keep each shot short. Save as `demo/safevoice-demo.mp4`, under 100 MB.

Before recording: delete `data/store.json`, `data/sim.json` and `data/sim-accounts.json` so the inbox, committee and accounts start clean, and open the home page once so the intro has played.

## 1. The possibility (0:00–0:20)

**Screen:** home page. Let the headline rise, then scroll slowly through the "How it works" story.

> This is SafeVoice. A student or staff member can report harassment or a safety problem, knowing that only an independent committee will ever read it. Not university IT, not the people who run the platform, and not anyone who breaks into the server.

## 2. The constraint (0:20–0:35)

**Screen:** keep scrolling to the dark "Who cannot read your report" block.

> Today, whoever administers a reporting system can read every report, and can give themselves access. That administrator usually works for the institution the report is about. So people stay silent.

## 3. The prototype (0:35–1:40)

**Screen:** Sign in → **Create account**. The page shows the "Plan C" banner.

> Tide's network is under heavy load today, so, as Tide suggested, this demo simulates TideCloak's sign-in and threshold network. The rules are enforced exactly as they would be.

**Screen:** create the account `minh.tran` with any password of 8+ characters. It lands on File a report. Choose "Safety hazard", paste the text below, send, show the receipt.

> Cửa thoát hiểm tầng 3 tòa nhà 2 bị khóa xích suốt hai tuần. Tôi đã báo quản lý phòng thí nghiệm nhưng không có gì thay đổi.

> A new account can only file reports. They write in their own language, and the report is encrypted right here in the browser before it is sent.

**Screen:** Sign out → **admin1** → Server view.

> University IT sees everything the server holds: ciphertext. Readable by this server: zero.

**Screen:** Admin → "Propose adding" admin1 → Approve. Show "1 of 2 approvals". Click Committee: refused.

> Could an admin just add themselves to the committee? They can propose it, and approve it, but one approval changes nothing. They are still locked out until a second admin agrees.

**Screen:** Sign out → **committee1** → Committee. The report decrypts on screen.

> A committee member opens it, and it is decrypted in their browser, Vietnamese intact.

## 4. What changes (1:40–2:00)

**Screen:** home page, scroll to "Your voice, sealed until the right people read it."

> With TideCloak, confidentiality no longer depends on trusting whoever runs the system. No single admin, server or vendor can open a report or change who reads them. People can speak up safely, and committees hear about problems sooner.
