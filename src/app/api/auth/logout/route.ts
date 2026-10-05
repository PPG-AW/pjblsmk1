import { NextResponse } from "next/server";
import { destroySession } from "@/lib/auth";
import { route } from "@/lib/http";

/** POST /api/auth/logout */
export const POST = route(async () => {
  await destroySession();
  return NextResponse.json({ ok: true });
});
