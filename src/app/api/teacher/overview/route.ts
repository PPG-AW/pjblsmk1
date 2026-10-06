import { NextResponse } from "next/server";
import { getTeacherOverview } from "@/db/queries";
import { requireTeacher } from "@/lib/auth";
import { route } from "@/lib/http";

/** GET /api/teacher/overview, seluruh data dashboard guru (query agregat). */
export const GET = route(async () => {
  await requireTeacher();
  const overview = await getTeacherOverview();
  return NextResponse.json(overview);
});
