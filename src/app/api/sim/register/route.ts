import type { NextRequest } from "next/server";
import { MIN_PASSWORD_LENGTH, SIMULATED, validUsername } from "@/lib/sim";
import { register, sessionCookie } from "@/lib/simStore";

// POST /api/sim/register { username, password } — Plan C stand-in for creating a Tide account.
// Every new account is a reporter; joining the committee needs a quorum of IT admins.
export async function POST(req: NextRequest) {
  if (!SIMULATED) return Response.json({ error: "Not found" }, { status: 404 });
  const body = (await req.json().catch(() => null)) as { username?: unknown; password?: unknown } | null;
  const username = typeof body?.username === "string" ? body.username.trim().toLowerCase() : "";
  const password = body?.password;
  if (!validUsername(username)) {
    return Response.json({ error: "Use 3 to 32 lowercase letters, digits, dots, dashes or underscores." }, { status: 400 });
  }
  if (typeof password !== "string" || password.length < MIN_PASSWORD_LENGTH || password.length > 200) {
    return Response.json({ error: `Use a password of at least ${MIN_PASSWORD_LENGTH} characters.` }, { status: 400 });
  }
  try {
    register(username, password);
  } catch (err) {
    return Response.json({ error: err instanceof Error ? err.message : String(err) }, { status: 409 });
  }
  const res = Response.json({ user: username }, { status: 201 });
  res.headers.append("Set-Cookie", await sessionCookie(username, req));
  return res;
}
