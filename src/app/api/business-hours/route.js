import db from "@/db";
import { business_hours } from "@/db/schema";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const rows = await db.select().from(business_hours);
    return NextResponse.json({ success: true, data: rows });
  } catch (e) {
    return NextResponse.json({ error: "Failed to fetch" }, { status: 500 });
  }
}

export async function PATCH(req) {
  try {
    const { day_of_week, closing_time } = await req.json();
    if (!day_of_week)
      return NextResponse.json(
        { error: "day_of_week required" },
        { status: 400 }
      );
    // Try to update first
    const existing = await db
      .select()
      .from(business_hours)
      .where(eq(business_hours.day_of_week, day_of_week));
    let result;
    if (existing.length) {
      result = await db
        .update(business_hours)
        .set({ closing_time })
        .where(eq(business_hours.day_of_week, day_of_week));
    } else {
      result = await db
        .insert(business_hours)
        .values({ day_of_week, closing_time });
    }
    return NextResponse.json({ success: true, data: result });
  } catch (e) {
    return NextResponse.json({ error: "Failed to update" }, { status: 500 });
  }
}
