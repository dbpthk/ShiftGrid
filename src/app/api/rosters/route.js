import db from "./../../../db/index";
import { rosters } from "./../../../db/schema";
import { NextResponse } from "next/server";
import { and, desc, eq } from "drizzle-orm";

export async function GET() {
  try {
    const rows = await db.select().from(rosters).orderBy(desc(rosters.id));
    return NextResponse.json({ success: true, data: rows });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to fetch" }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const body = await req.json();
    const { employee_id, shift_date, shift_start, shift_end, role } = body;
    if (!employee_id || !shift_date || !shift_start || !shift_end) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }
    const result = await db
      .insert(rosters)
      .values({ employee_id, shift_date, shift_start, shift_end, role })
      .returning();
    return NextResponse.json({ success: true, data: result });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to create" }, { status: 500 });
  }
}

export async function PATCH(req) {
  try {
    const body = await req.json();
    const { id, employee_id, shift_date, shift_start, shift_end, role } = body;
    if (!id)
      return NextResponse.json({ error: "id is required" }, { status: 400 });
    const values = {};
    if (typeof employee_id !== "undefined") values.employee_id = employee_id;
    if (typeof shift_date !== "undefined") values.shift_date = shift_date;
    if (typeof shift_start !== "undefined") values.shift_start = shift_start;
    if (typeof shift_end !== "undefined") values.shift_end = shift_end;
    if (typeof role !== "undefined") values.role = role;
    const result = await db
      .update(rosters)
      .set(values)
      .where(eq(rosters.id, id))
      .returning();
    return NextResponse.json({ success: true, data: result });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to update" }, { status: 500 });
  }
}

export async function DELETE(req) {
  try {
    const { searchParams } = new URL(req.url);
    const id = Number(searchParams.get("id"));
    if (!id)
      return NextResponse.json({ error: "id is required" }, { status: 400 });
    await db.delete(rosters).where(eq(rosters.id, id));
    return NextResponse.json({ success: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to delete" }, { status: 500 });
  }
}
