import db from "./../../../db/index";
import { business_requirements } from "./../../../db/schema";
import { NextResponse } from "next/server";
import { and, desc, eq, ne } from "drizzle-orm";

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
      chef_end_is_closing,
      kitchen_start,
      kitchen_end,
      kitchen_end_is_closing,
      chef_slots,
      kitchen_slots,
      notes,
    } = data;
    if (!day_of_week) {
      return NextResponse.json(
        { error: "day_of_week is required" },
        { status: 400 }
      );
    }
    // Enforce unique day
    const existingDay = await db
      .select()
      .from(business_requirements)
      .where(eq(business_requirements.day_of_week, day_of_week));
    if (existingDay.length > 0) {
      return NextResponse.json(
        { error: "A requirement for this day already exists" },
        { status: 400 }
      );
    }

    // Initialize slots if not provided
    const normalizedChefSlots = Array.isArray(chef_slots)
      ? chef_slots
      : Array.from({ length: Number(required_chefs || 0) }).map(() => ({
          start: chef_start || null,
          end: chef_end_is_closing ? null : chef_end || null,
          end_is_closing: Boolean(chef_end_is_closing),
        }));
    const normalizedKitchenSlots = Array.isArray(kitchen_slots)
      ? kitchen_slots
      : Array.from({ length: Number(required_kitchen_hands || 0) }).map(() => ({
          start: kitchen_start || null,
          end: kitchen_end_is_closing ? null : kitchen_end || null,
          end_is_closing: Boolean(kitchen_end_is_closing),
        }));

    const result = await db.insert(business_requirements).values({
      day_of_week,
      required_chefs,
      required_kitchen_hands,
      chef_start: chef_start ? chef_start : null,
      chef_end: chef_end_is_closing ? null : chef_end ? chef_end : null,
      chef_end_is_closing: Boolean(chef_end_is_closing),
      kitchen_start: kitchen_start ? kitchen_start : null,
      kitchen_end: kitchen_end_is_closing
        ? null
        : kitchen_end
        ? kitchen_end
        : null,
      kitchen_end_is_closing: Boolean(kitchen_end_is_closing),
      chef_slots: normalizedChefSlots,
      kitchen_slots: normalizedKitchenSlots,
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
      chef_end_is_closing,
      kitchen_start,
      kitchen_end,
      kitchen_end_is_closing,
      chef_slots,
      kitchen_slots,
      notes,
    } = data;
    if (!id) {
      return NextResponse.json({ error: "id is required" }, { status: 400 });
    }

    const values = {};
    if (typeof day_of_week !== "undefined") {
      const conflict = await db
        .select()
        .from(business_requirements)
        .where(
          and(
            eq(business_requirements.day_of_week, day_of_week),
            ne(business_requirements.id, id)
          )
        );
      if (conflict.length > 0) {
        return NextResponse.json(
          { error: "A requirement for this day already exists" },
          { status: 400 }
        );
      }
      values.day_of_week = day_of_week;
    }
    if (typeof required_chefs !== "undefined")
      values.required_chefs = required_chefs;
    if (typeof required_kitchen_hands !== "undefined")
      values.required_kitchen_hands = required_kitchen_hands;
    if (typeof chef_start !== "undefined")
      values.chef_start = chef_start ? chef_start : null;
    if (typeof chef_end_is_closing !== "undefined")
      values.chef_end_is_closing = Boolean(chef_end_is_closing);
    if (typeof chef_end !== "undefined")
      values.chef_end = chef_end_is_closing ? null : chef_end ? chef_end : null;
    if (typeof kitchen_start !== "undefined")
      values.kitchen_start = kitchen_start ? kitchen_start : null;
    if (typeof kitchen_end_is_closing !== "undefined")
      values.kitchen_end_is_closing = Boolean(kitchen_end_is_closing);
    if (typeof kitchen_end !== "undefined")
      values.kitchen_end = kitchen_end_is_closing
        ? null
        : kitchen_end
        ? kitchen_end
        : null;
    if (typeof chef_slots !== "undefined") values.chef_slots = chef_slots;
    if (typeof kitchen_slots !== "undefined")
      values.kitchen_slots = kitchen_slots;
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

export async function DELETE(req) {
  try {
    const { searchParams } = new URL(req.url);
    const id = Number(searchParams.get("id"));
    if (!id) {
      return NextResponse.json({ error: "id is required" }, { status: 400 });
    }
    await db
      .delete(business_requirements)
      .where(eq(business_requirements.id, id));
    return NextResponse.json({ success: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to delete" }, { status: 500 });
  }
}
