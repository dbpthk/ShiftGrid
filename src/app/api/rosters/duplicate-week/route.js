import { NextResponse } from "next/server";
import { inArray } from "drizzle-orm";
import db from "../../../../db/index";
import { rosters } from "../../../../db/schema";
import { revalidatePath } from "next/cache";

const parseIsoDate = (value) => {
  if (!value) return null;
  const [yearStr, monthStr, dayStr] = value.split("-");
  const year = Number(yearStr);
  const month = Number(monthStr) - 1;
  const day = Number(dayStr);
  if (Number.isNaN(year) || Number.isNaN(month) || Number.isNaN(day)) {
    return null;
  }
  const date = new Date(year, month, day, 0, 0, 0, 0);
  return Number.isNaN(date.getTime()) ? null : date;
};

const toISO = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const buildWeekDates = (startDate) => {
  const dates = [];
  for (let i = 0; i < 7; i += 1) {
    const d = new Date(startDate);
    d.setDate(startDate.getDate() + i);
    dates.push(toISO(d));
  }
  return dates;
};

export async function POST(req) {
  try {
    const body = await req.json();
    const { sourceWeekStart, targetWeekStart, replaceExisting = true } = body || {};

    const sourceDate = parseIsoDate(sourceWeekStart);
    const targetDate = parseIsoDate(targetWeekStart);

    if (!sourceDate || !targetDate) {
      return NextResponse.json(
        { error: "Both sourceWeekStart and targetWeekStart are required" },
        { status: 400 }
      );
    }

    const sourceDates = buildWeekDates(sourceDate);
    const targetDates = buildWeekDates(targetDate);

    const sourceRows = await db
      .select()
      .from(rosters)
      .where(inArray(rosters.shift_date, sourceDates));

    if (sourceRows.length === 0) {
      return NextResponse.json(
        { error: "No roster entries found for the selected source week" },
        { status: 404 }
      );
    }

    if (replaceExisting) {
      await db.delete(rosters).where(inArray(rosters.shift_date, targetDates));
    }

    const dateMap = new Map();
    sourceDates.forEach((sourceIso, idx) => {
      dateMap.set(sourceIso, targetDates[idx]);
    });

    const inserts = sourceRows.map((row) => ({
      employee_id: row.employee_id,
      shift_date: dateMap.get(row.shift_date),
      shift_start: row.shift_start,
      shift_end: row.shift_end,
      role: row.role,
      is_weekend: row.is_weekend,
    }));

    if (inserts.length > 0) {
      await db.insert(rosters).values(inserts);
    }

    await Promise.all([
      revalidatePath("/Roster"),
      revalidatePath("/dashboard"),
      revalidatePath("/"),
    ]);

    return NextResponse.json({ success: true, inserted: inserts.length });
  } catch (error) {
    console.error("[duplicate-week]", error);
    return NextResponse.json(
      { error: "Failed to duplicate roster for selected week" },
      { status: 500 }
    );
  }
}
