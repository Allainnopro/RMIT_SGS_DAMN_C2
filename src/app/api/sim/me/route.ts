import { withAuth } from "@/lib/auth/middleware";

// GET /api/sim/me — who the simulated session says you are, with the roles and groups the server enforces.
export const GET = withAuth(async (_req, jwt) =>
  Response.json({
    user: jwt.preferred_username,
    roles: (jwt.realm_access as { roles?: string[] } | undefined)?.roles ?? [],
    groups: jwt.groups ?? [],
  }),
);
