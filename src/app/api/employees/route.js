import db from "./../../../db/index";
import { employees, employee_availability } from "./../../../db/schema";
import { NextResponse } from "next/server";
import { desc, eq } from "drizzle-orm";

export async function POST(req) {
  try {
    const data = await req.json(); // parse incoming JSON
    const { name, role, email, phone, availability } = data;

    if (!name || !role) {
      return NextResponse.json(
        { error: "Name and role are required" },
        { status: 400 }
      );
    }

    const inserted = await db
      .insert(employees)
      .values({ name, role, email, phone })
      .returning({ id: employees.id });

    const newId = inserted?.[0]?.id;

    if (newId && availability && typeof availability === "object") {
      const DAYS = [
        "Monday",
        "Tuesday",
        "Wednesday",
        "Thursday",
        "Friday",
        "Saturday",
        "Sunday",
      ];
      const rows = DAYS.map((d) => ({
        employee_id: newId,
        day_of_week: d,
        is_available: Boolean(availability[d]),
      }));
      await db.insert(employee_availability).values(rows);
    }

    return NextResponse.json({ success: true, data: { id: newId } });
  } catch (error) {
    console.error("API Error:", error);
    return NextResponse.json(
      { error: "Failed to add employee" },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const result = await db
      .select()
      .from(employees)
      .orderBy(desc(employees.created_at));
    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    console.error("API Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch employees" },
      { status: 500 }
    );
  }
}

export async function PATCH(req) {
  try {
    const body = await req.json();
    const { id, name, role, email, phone } = body;
    if (!id) {
      return NextResponse.json({ error: "id is required" }, { status: 400 });
    }
    const values = {};
    if (typeof name !== "undefined") values.name = name;
    if (typeof role !== "undefined") values.role = role;
    if (typeof email !== "undefined") values.email = email;
    if (typeof phone !== "undefined") values.phone = phone;
    const result = await db
      .update(employees)
      .set(values)
      .where(eq(employees.id, id))
      .returning();
    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    console.error("API Error:", error);
    return NextResponse.json(
      { error: "Failed to update employee" },
      { status: 500 }
    );
  }
}
