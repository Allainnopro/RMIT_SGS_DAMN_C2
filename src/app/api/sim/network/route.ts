import { webcrypto } from "crypto";
import { withAuth, withRole } from "@/lib/auth/middleware";
import { COMMITTEE_GROUP, inGroup, REPORTER_ROLE } from "@/lib/access";
import { network } from "@/lib/simStore";

// The simulated Tide network (Plan C). Live, these two answers come from Tide's threshold network.

// GET — the inbox's sealing key, to reporters only (live: the inbox-write policy).
export const GET = withRole(REPORTER_ROLE, async () => Response.json({ publicJwk: (await network()).publicJwk }));

// POST { k } — unwrap one report's key, to committee members only (live: the inbox-read policy).
// The report itself is never sent here: the committee member's browser decrypts it.
export const POST = withAuth(async (req, jwt) => {
  if (!inGroup(jwt, COMMITTEE_GROUP)) return Response.json({ error: "Forbidden" }, { status: 403 });
  const k = ((await req.json().catch(() => null)) as { k?: unknown } | null)?.k;
  if (typeof k !== "string" || k.length > 1024) return Response.json({ error: "Missing key" }, { status: 400 });
  try {
    const priv = await webcrypto.subtle.importKey("jwk", (await network()).privateJwk, { name: "RSA-OAEP", hash: "SHA-256" }, false, ["decrypt"]);
    const raw = await webcrypto.subtle.decrypt({ name: "RSA-OAEP" }, priv, Buffer.from(k, "base64"));
    return Response.json({ key: Buffer.from(raw).toString("base64") });
  } catch {
    return Response.json({ error: "This report is damaged and can't be shown." }, { status: 400 });
  }
});
