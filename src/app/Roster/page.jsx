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
import RosterWeekNavigator from "./RosterWeekNavigator";

export const dynamic = "force-dynamic";

function normalizeWeekStart(startParam) {
  if (!startParam) return null;
  const parts = startParam.split("-");
  if (parts.length !== 3) return null;
  const [yearStr, monthStr, dayStr] = parts;
  const year = Number(yearStr);
  const month = Number(monthStr) - 1;
  const day = Number(dayStr);
  if (Number.isNaN(year) || Number.isNaN(month) || Number.isNaN(day)) {
    return null;
  }
  const date = new Date(year, month, day, 0, 0, 0, 0);
  return Number.isNaN(date.getTime()) ? null : date;
}

const toLocalISO = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

export default async function RosterPage({ searchParams }) {
  const today = new Date();
  const paramStart = normalizeWeekStart(searchParams?.weekStart);
  const baseDate = paramStart || today;

  // Find the Monday of selected week
  const baseDay = baseDate.getDay();
  const mondayOffset = baseDay === 0 ? -6 : 1 - baseDay;
  const monday = new Date(baseDate);
  monday.setHours(0, 0, 0, 0);
  monday.setDate(baseDate.getDate() + mondayOffset);

  const weekDays = Array.from({ length: 7 }).map((_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    const iso = toLocalISO(d);
    const dayName = d.toLocaleDateString(undefined, { weekday: "long" });
    return { date: iso, dayName };
  });

  const weekStartIso = weekDays[0].date;
  const weekEndIso = weekDays[6].date;

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
          <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-between">
            <div className="text-center sm:text-left">
              <CardTitle className="text-3xl font-semibold tracking-wide drop-shadow-sm">
                Roster — {weekStartIso} to {weekEndIso}
              </CardTitle>
              <p className="mt-1 text-sm font-medium text-gray-600">
                Manage this week's split shifts and assignments
              </p>
            </div>
            <RosterWeekNavigator initialStart={weekStartIso} />
          </div>
        </CardHeader>
        <CardContent>
          <RosterWeekEditor
            weekDays={weekDays}
            employees={allEmployees}
            employeeAvailability={employeeAvailability}
            requirements={requirements}
            existing={existing}
            weekLabel={`${weekStartIso} → ${weekEndIso}`}
          />
        </CardContent>
      </Card>
    </div>
  );
}
