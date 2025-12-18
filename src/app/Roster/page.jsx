import React from "react";
import db from "@/db";
import {
  rosters,
  employees,
  employee_availability,
  business_requirements,
} from "@/db/schema";
import { asc, inArray } from "drizzle-orm";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import RosterWeekEditor from "./RosterWeekEditor";
import WeekPlanner from "./WeekPlanner";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

function normalizeWeekStart(startParam) {
  if (!startParam) return null;
  const decoded = decodeURIComponent(startParam).trim();
  if (!decoded) return null;

  const isoMatch = decoded.match(/^\d{4}-\d{2}-\d{2}$/);
  if (isoMatch) {
    const [yearStr, monthStr, dayStr] = decoded.split("-");
    const year = Number(yearStr);
    const month = Number(monthStr) - 1;
    const day = Number(dayStr);
    const date = new Date(year, month, day, 0, 0, 0, 0);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  const displayMatch = decoded.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (displayMatch) {
    const [, dd, mm, yyyy] = displayMatch;
    const date = new Date(Number(yyyy), Number(mm) - 1, Number(dd), 0, 0, 0, 0);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  return null;
}

const toLocalISO = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const toDisplayDate = (date) => {
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
};

export default async function RosterPage({ searchParams }) {
  const today = new Date();
  const paramStartRaw = searchParams?.weekStart;
  const paramStart = normalizeWeekStart(paramStartRaw);
  const baseDate = paramStart || today;

  // Find the Monday of selected week
  const baseDay = baseDate.getDay();
  const mondayOffset = baseDay === 0 ? -6 : 1 - baseDay;
  const monday = new Date(baseDate);
  monday.setHours(0, 0, 0, 0);
  monday.setDate(baseDate.getDate() + mondayOffset);

  const weekDays = [];
  for (let i = 0; i < 7; i += 1) {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    const iso = toLocalISO(d);
    const dayName = d.toLocaleDateString(undefined, { weekday: "long" });
    weekDays.push({ date: iso, dayName, displayDate: toDisplayDate(d) });
  }

  const weekStartIso = weekDays[0].date;
  const weekEndIso = weekDays[6].date;
  const weekStartDisplay = weekDays[0].displayDate;
  const weekEndDisplay = weekDays[6].displayDate;

  // Load employees and availability
  const allEmployees = await db.select().from(employees);
  const availability = await db.select().from(employee_availability);

  // Build availability map: employee_id -> [days]
  const employeeAvailability = new Map();
  for (const av of availability) {
    if (!av.is_available) continue;
    if (!employeeAvailability.has(av.employee_id)) {
      employeeAvailability.set(av.employee_id, []);
    }
    employeeAvailability.get(av.employee_id).push(av.day_of_week);
  }

  // Load business requirements
  const reqRows = await db.select().from(business_requirements);
  const requirements = reqRows.reduce((acc, r) => {
    acc[r.day_of_week] = r;
    return acc;
  }, {});

  // Load existing rosters for the selected week
  const weekDates = weekDays.map((d) => d.date);
  const existing = await db
    .select()
    .from(rosters)
    .where(inArray(rosters.shift_date, weekDates))
    .orderBy(
      asc(rosters.shift_date),
      asc(rosters.role),
      asc(rosters.shift_start),
      asc(rosters.id)
    );

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="px-6 py-6 shadow-sm">
          <div className="flex flex-col items-center w-full gap-4">
            <div className="flex flex-col items-center text-center">
              <CardTitle className="text-3xl font-semibold tracking-wide drop-shadow-sm">
                Roster
              </CardTitle>
              <p className="text-sm font-medium text-gray-600">
                Week: {weekStartDisplay} → {weekEndDisplay}
              </p>
            </div>
            <WeekPlanner currentWeekIso={weekStartIso} />
          </div>
        </CardHeader>
        <CardContent>
          <RosterWeekEditor
            weekDays={weekDays}
            employees={allEmployees}
            employeeAvailability={employeeAvailability}
            requirements={requirements}
            existing={existing}
            weekStartIso={weekStartIso}
          />
        </CardContent>
      </Card>
    </div>
  );
}
