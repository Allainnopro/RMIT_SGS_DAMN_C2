import { randomUUID } from "crypto";
import { withRole } from "@/lib/auth/middleware";
import { IT_ADMIN_ROLE } from "@/lib/access";
import { approve, propose } from "@/lib/sim";
import { accountExists, allAccounts, readSim, writeSim } from "@/lib/simStore";

// Committee membership under quorum (Plan C stand-in for TideCloak's IGA change requests).
// Returns the account list too, so admins can propose anyone who has signed up.
export const GET = withRole(IT_ADMIN_ROLE, async () => Response.json({ ...readSim(), accounts: allAccounts() }));

// POST { op: "propose", subject, change } | { op: "approve", id }
export const POST = withRole(IT_ADMIN_ROLE, async (req, jwt) => {
  const me = String(jwt.preferred_username);
  const body = (await req.json().catch(() => null)) as { op?: string; subject?: unknown; change?: unknown; id?: unknown } | null;
  try {
    let next;
    if (body?.op === "propose" && typeof body.subject === "string" && accountExists(body.subject) && (body.change === "add" || body.change === "remove")) {
      next = propose(readSim(), { subject: body.subject, change: body.change, by: me, id: randomUUID(), at: new Date().toISOString() });
    } else if (body?.op === "approve" && typeof body.id === "string") {
      next = approve(readSim(), body.id, me);
    } else {
      return Response.json({ error: "Bad request" }, { status: 400 });
    }
    writeSim(next);
    return Response.json({ ...next, accounts: allAccounts() });
  } catch (err) {
    return Response.json({ error: err instanceof Error ? err.message : String(err) }, { status: 409 });
  }
});
