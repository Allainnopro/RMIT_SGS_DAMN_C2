import type { NextRequest } from "next/server";
import { withAuth, withRole } from "@/lib/auth/middleware";
import { loadTideConfig } from "@/lib/auth/tidecloakConfig";
import { IT_ADMIN_ROLE, isPolicyName, mayReadPolicy } from "@/lib/access";
import { checkPolicy } from "@/lib/policyCheck";
import { getPolicy, setPolicy } from "@/lib/store";

// withAuth hands the handler only the request, so the [name] segment is read from the URL.
const nameOf = (req: NextRequest) => decodeURIComponent(new URL(req.url).pathname.split("/").pop() ?? "");

// GET /api/policies/:name — the signed policy, only to the subject it names.
export const GET = withAuth(async (req, jwt) => {
  const name = nameOf(req);
  if (!isPolicyName(name)) return Response.json({ error: "Unknown policy" }, { status: 404 });
  if (!mayReadPolicy(jwt, name)) return Response.json({ error: "Forbidden" }, { status: 403 });
  const policy = getPolicy(name);
  if (!policy) return Response.json({ error: "not set up" }, { status: 404 });
  return Response.json({ policy });
});

// PUT /api/policies/:name — IT admins store a signed policy. Body: { policy } (base64).
// Checked before storing, so junk can never replace a working policy and lock people out.
export const PUT = withRole(IT_ADMIN_ROLE, async (req) => {
  const name = nameOf(req);
  if (!isPolicyName(name)) return Response.json({ error: "Unknown policy" }, { status: 404 });
  const policy = ((await req.json().catch(() => null)) as { policy?: unknown } | null)?.policy;
  if (typeof policy !== "string") return Response.json({ error: "Missing policy" }, { status: 400 });
  const problem = checkPolicy(name, policy, loadTideConfig().vendorId ?? "");
  if (problem) return Response.json({ error: problem }, { status: 400 });
  setPolicy(name, policy);
  return new Response(null, { status: 204 });
});
