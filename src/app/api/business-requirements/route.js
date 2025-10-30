import db from "./../../../db/index";
import { business_requirements } from "./../../../db/schema";
import { NextResponse } from "next/server";
import { desc, eq } from "drizzle-orm";

export async function GET() {
  try {
    const rows = await db
      .select()
      .from(business_requirements)
      .orderBy(desc(business_requirements.id));
    return NextResponse.json({ success: true, data: rows });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to fetch" }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const data = await req.json();
    const {
      day_of_week,
      required_chefs,
      required_kitchen_hands,
      chef_start,
      chef_end,
      kitchen_start,
      kitchen_end,
      notes,
    } = data;
    if (!day_of_week) {
      return NextResponse.json(
        { error: "day_of_week is required" },
        { status: 400 }
      );
    }
    const result = await db.insert(business_requirements).values({
      day_of_week,
      required_chefs,
      required_kitchen_hands,
      chef_start,
      chef_end,
      kitchen_start,
      kitchen_end,
      notes,
    });
    return NextResponse.json({ success: true, data: result });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to save" }, { status: 500 });
  }
}

export async function PATCH(req) {
  try {
    const data = await req.json();
    const {
      id,
      day_of_week,
      required_chefs,
      required_kitchen_hands,
      chef_start,
      chef_end,
      kitchen_start,
      kitchen_end,
      notes,
    } = data;
    if (!id) {
      return NextResponse.json({ error: "id is required" }, { status: 400 });
    }

    const values = {};
    if (typeof day_of_week !== "undefined") values.day_of_week = day_of_week;
    if (typeof required_chefs !== "undefined")
      values.required_chefs = required_chefs;
    if (typeof required_kitchen_hands !== "undefined")
      values.required_kitchen_hands = required_kitchen_hands;
    if (typeof chef_start !== "undefined") values.chef_start = chef_start;
    if (typeof chef_end !== "undefined") values.chef_end = chef_end;
    if (typeof kitchen_start !== "undefined")
      values.kitchen_start = kitchen_start;
    if (typeof kitchen_end !== "undefined") values.kitchen_end = kitchen_end;
    if (typeof notes !== "undefined") values.notes = notes;

    const result = await db
      .update(business_requirements)
      .set(values)
      .where(eq(business_requirements.id, id))
      .returning();

    return NextResponse.json({ success: true, data: result });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to update" }, { status: 500 });
  }
}
