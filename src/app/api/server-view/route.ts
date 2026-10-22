import { withRole } from "@/lib/auth/middleware";
import { IT_ADMIN_ROLE } from "@/lib/access";
import { readStore } from "@/lib/store";

// GET /api/server-view — everything the server holds: ciphertext and signed policies, nothing readable.
export const GET = withRole(IT_ADMIN_ROLE, async () => Response.json(readStore()));
