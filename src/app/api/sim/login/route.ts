import type { NextRequest } from "next/server";
import { isPersona, signSession, SIMULATED } from "@/lib/sim";
import { network, SIM_COOKIE } from "@/lib/simStore";

const off = () => Response.json({ error: "Not found" }, { status: 404 });

// POST /api/sim/login { persona } — Plan C stand-in for Tide sign-in. DELETE signs out.
export async function POST(req: NextRequest) {
  if (!SIMULATED) return off();
  const persona = ((await req.json().catch(() => null)) as { persona?: unknown } | null)?.persona;
  if (!isPersona(persona)) return Response.json({ error: "Unknown persona" }, { status: 400 });
  const secure = req.headers.get("x-forwarded-proto") === "https" || req.nextUrl.protocol === "https:";
  const res = Response.json({ user: persona });
  res.headers.append(
    "Set-Cookie",
    `${SIM_COOKIE}=${signSession(persona, (await network()).secret)}; Path=/; HttpOnly; SameSite=Lax${secure ? "; Secure" : ""}`,
  );
  return res;
}

export async function DELETE() {
  if (!SIMULATED) return off();
  const res = new Response(null, { status: 204 });
  res.headers.append("Set-Cookie", `${SIM_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`);
  return res;
}
