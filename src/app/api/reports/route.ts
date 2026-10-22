import { withAuth, withRole } from "@/lib/auth/middleware";
import { COMMITTEE_GROUP, inGroup, parseReportBody, REPORTER_ROLE } from "@/lib/access";
import { addReport, readStore } from "@/lib/store";

// POST /api/reports — a reporter files a report. Body: { ciphertext }. No plaintext field is stored.
export const POST = withRole(REPORTER_ROLE, async (req) => {
  const parsed = parseReportBody(await req.json().catch(() => null));
  if ("error" in parsed) return Response.json({ error: parsed.error }, { status: 400 });
  try {
    const { id } = addReport(parsed.ciphertext);
    return Response.json({ id }, { status: 201 });
  } catch {
    return Response.json({ error: "Not saved" }, { status: 500 });
  }
});

// GET /api/reports — committee members only. They decrypt in their own browser.
export const GET = withAuth(async (_req, jwt) => {
  if (!inGroup(jwt, COMMITTEE_GROUP)) return Response.json({ error: "Forbidden" }, { status: 403 });
  return Response.json({ reports: readStore().reports });
});
