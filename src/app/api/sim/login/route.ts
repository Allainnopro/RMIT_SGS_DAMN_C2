import type { NextRequest } from "next/server";
import { SIMULATED, validUsername } from "@/lib/sim";
import { authenticate, SIM_COOKIE, sessionCookie } from "@/lib/simStore";

const off = () => Response.json({ error: "Not found" }, { status: 404 });

// POST /api/sim/login { username, password } — Plan C stand-in for Tide sign-in. DELETE signs out.
export async function POST(req: NextRequest) {
  if (!SIMULATED) return off();
  const body = (await req.json().catch(() => null)) as { username?: unknown; password?: unknown } | null;
  const username = typeof body?.username === "string" ? body.username.trim().toLowerCase() : "";
  const password = body?.password;
  // One message for every failure, so the form never reveals which usernames exist.
  const wrong = () => Response.json({ error: "Wrong username or password." }, { status: 401 });
  if (!validUsername(username) || typeof password !== "string" || password.length > 200) return wrong();
  try {
    if (!authenticate(username, password)) return wrong();
  } catch (err) {
    return Response.json({ error: err instanceof Error ? err.message : String(err) }, { status: 500 });
  }
  const res = Response.json({ user: username });
  res.headers.append("Set-Cookie", await sessionCookie(username, req));
  return res;
}

export async function DELETE() {
  if (!SIMULATED) return off();
  const res = new Response(null, { status: 204 });
  res.headers.append("Set-Cookie", `${SIM_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`);
  return res;
}
