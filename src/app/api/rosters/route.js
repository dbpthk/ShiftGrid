import db from "./../../../db/index";
import { rosters } from "./../../../db/schema";
import { NextResponse } from "next/server";
import { desc } from "drizzle-orm";

export async function GET() {
  try {
    const rows = await db.select().from(rosters).orderBy(desc(rosters.id));
    return NextResponse.json({ success: true, data: rows });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to fetch" }, { status: 500 });
  }
}
