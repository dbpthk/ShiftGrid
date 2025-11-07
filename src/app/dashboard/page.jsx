import React from "react";
import db from "@/db";
import {
  rosters,
  employees,
  employee_availability,
  business_requirements,
} from "@/db/schema";
import { inArray } from "drizzle-orm";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import ExportRosterButton from "../Roster/ExportRosterButton";
import ExportTableButton from "../Roster/ExportTableButton";
import {
  createSlotArray,
  formatSegmentsForDisplay,
  mapRosterEntriesToSlots,
} from "@/lib/slot-utils";

function normalizeWeekStart(startParam) {
  if (!startParam) return null;
  const date = new Date(startParam);
  if (Number.isNaN(date.getTime())) return null;
  return date;
}

function toISODate(date) {
  return date.toISOString().slice(0, 10);
}

export const dynamic = "force-dynamic";

export default async function Dashboard({ searchParams }) {
  const today = new Date();
  const paramStart = normalizeWeekStart(searchParams?.weekStart);
  const baseDate = paramStart || today;

  const baseDay = baseDate.getDay();
  const mondayOffset = baseDay === 0 ? -6 : 1 - baseDay;
  const monday = new Date(baseDate);
  monday.setHours(0, 0, 0, 0);
  monday.setDate(baseDate.getDate() + mondayOffset);

  const weekDays = Array.from({ length: 7 }).map((_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    const iso = toISODate(d);
    const dayName = d.toLocaleDateString(undefined, { weekday: "long" });
    return { date: iso, dayName };
  });

  const weekStartIso = weekDays[0].date;
  const weekEndIso = weekDays[6].date;

  const allEmployees = await db.select().from(employees);
  const availability = await db.select().from(employee_availability);

  const employeeAvailability = new Map();
  for (const av of availability) {
    if (!av.is_available) continue;
    if (!employeeAvailability.has(av.employee_id)) {
      employeeAvailability.set(av.employee_id, []);
    }
    employeeAvailability.get(av.employee_id).push(av.day_of_week);
  }

  const reqRows = await db.select().from(business_requirements);
  const requirements = reqRows.reduce((acc, r) => {
    acc[r.day_of_week] = r;
    return acc;
  }, {});

  const weekDates = weekDays.map((d) => d.date);
  const existingRosters = await db
    .select()
    .from(rosters)
    .where(inArray(rosters.shift_date, weekDates));

  const employeeIds = Array.from(
    new Set(existingRosters.map((r) => r.employee_id))
  );
  const employeesMap = new Map();
  if (employeeIds.length > 0) {
    const employeesData = await db
      .select()
      .from(employees)
      .where(inArray(employees.id, employeeIds));
    employeesData.forEach((emp) => employeesMap.set(emp.id, emp.name));
  }

  const rostersByDay = {};
  weekDays.forEach((day) => {
    rostersByDay[day.date] = {
      Chef: [],
      "Kitchen Hand": [],
    };
  });

  const sortedRosters = [...existingRosters].sort((a, b) => {
    const dateCompare = String(a.shift_date).localeCompare(String(b.shift_date));
    if (dateCompare !== 0) return dateCompare;
    const roleCompare = String(a.role || "").localeCompare(String(b.role || ""));
    if (roleCompare !== 0) return roleCompare;
    const startCompare = String(a.shift_start || "").localeCompare(
      String(b.shift_start || "")
    );
    if (startCompare !== 0) return startCompare;
    return (a.id || 0) - (b.id || 0);
  });

  sortedRosters.forEach((roster) => {
    const dayRosters = rostersByDay[roster.shift_date];
    if (dayRosters && roster.role && dayRosters[roster.role]) {
      dayRosters[roster.role].push(roster);
    }
  });

  const closingRows = await db
    .select()
    .from(require("@/db/schema").business_hours);
  const closingMap = {};
  closingRows.forEach((row) => {
    closingMap[row.day_of_week] = row.closing_time;
  });

  function parseTimeToMins(str) {
    if (!str) return null;
    const [h, m] = str.split(":");
    return Number(h) * 60 + Number(m);
  }
  function calcAssignedMinutes(slots, assignments, closingTime) {
    if (!Array.isArray(slots)) return 0;
    let mins = 0;
    slots.forEach((slot, slotIdx) => {
      const segments = slot?.segments || [];
      const assignedSegments = Array.isArray(assignments?.[slotIdx])
        ? assignments[slotIdx]
        : [];
      segments.forEach((segment, segIdx) => {
        const entry = assignedSegments[segIdx];
        if (!entry || !segment?.start) return;
        const start = parseTimeToMins(segment.start);
        if (start == null) return;
        const end = segment.end_is_closing
          ? parseTimeToMins(closingTime)
          : parseTimeToMins(segment.end);
        if (end == null) return;
        let diff = end - start;
        if (diff < 0) diff += 24 * 60;
        mins += diff;
      });
    });
    return mins;
  }

  const dayDetails = weekDays.map((day) => {
    const req = requirements[day.dayName] || {};
    const closingTime = closingMap[day.dayName];
    const chefSlots = createSlotArray(req.chef_slots, req.required_chefs);
    const kitchenSlots = createSlotArray(
      req.kitchen_slots,
      req.required_kitchen_hands
    );

    const chefAssignments = mapRosterEntriesToSlots(
      chefSlots,
      rostersByDay[day.date]?.Chef || []
    );
    const kitchenAssignments = mapRosterEntriesToSlots(
      kitchenSlots,
      rostersByDay[day.date]?.["Kitchen Hand"] || []
    );

    const totalMinutes =
      calcAssignedMinutes(chefSlots, chefAssignments, closingTime) +
      calcAssignedMinutes(kitchenSlots, kitchenAssignments, closingTime);

    return {
      day,
      chefSlots,
      chefAssignments,
      kitchenSlots,
      kitchenAssignments,
      totalHours: totalMinutes / 60,
    };
  });

  const weekHours = dayDetails.reduce((sum, detail) => sum + detail.totalHours, 0);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-2xl">Weekly Roster Dashboard</CardTitle>
              <p className="text-sm text-gray-500">
                {weekStartIso} to {weekEndIso}
              </p>
            </div>
            <div className="flex gap-2">
              <ExportTableButton
                weekDays={weekDays}
                employees={allEmployees}
                employeeAvailability={employeeAvailability}
                requirements={requirements}
                existing={existingRosters}
              />
              <ExportRosterButton
                weekDays={weekDays}
                employees={allEmployees}
                employeeAvailability={employeeAvailability}
                requirements={requirements}
                existing={existingRosters}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            <div className="text-right text-xs text-gray-600 font-semibold">
              TOTAL ROSTERED HOURS FOR WEEK: {weekHours.toFixed(1)}
            </div>
            {dayDetails.map(
              ({
                day,
                chefSlots,
                chefAssignments,
                kitchenSlots,
                kitchenAssignments,
                totalHours,
              }) => (
                <div
                  key={day.date}
                  className="rounded-lg border border-gray-200"
                >
                  <div className="border-b px-4 py-3 text-sm font-medium text-gray-800 bg-gray-50">
                    {day.dayName} — {day.date}
                    <span className="ml-2 text-xs font-normal text-gray-500">
                      Total Hours: {totalHours.toFixed(1)}
                    </span>
                  </div>
                  <div className="grid gap-4 p-4 sm:grid-cols-2">
                    {[{ label: "Chef", slots: chefSlots, assignments: chefAssignments },
                      {
                        label: "Kitchen Hand",
                        slots: kitchenSlots,
                        assignments: kitchenAssignments,
                      },
                    ].map(({ label, slots, assignments }) => (
                      <div key={label} className="space-y-3">
                        <div className="font-semibold text-gray-700">
                          {label} ({slots.length})
                        </div>
                        {slots.map((slot, slotIdx) => {
                          const segments = slot.segments || [];
                          const assigned = Array.isArray(assignments?.[slotIdx])
                            ? assignments[slotIdx]
                            : [];
                          return (
                            <div
                              key={`${label}-${slotIdx}`}
                              className="space-y-1 rounded-md border border-gray-200 p-2"
                            >
                              <div className="text-[11px] font-semibold uppercase text-gray-600">
                                {label === "Chef" ? `C${slotIdx + 1}` : `KH${slotIdx + 1}`}
                                <span className="ml-2 text-gray-400 normal-case">
                                  {formatSegmentsForDisplay(slot, closingMap[day.dayName])}
                                </span>
                              </div>
                              <div className="space-y-1">
                                {segments.map((segment, segIdx) => {
                                  const entry = assigned[segIdx];
                                  const employeeName = entry
                                    ? employeesMap.get(entry.employee_id) ||
                                      `Employee ${entry.employee_id}`
                                    : "Unassigned";
                                  const timeLabel = formatSegmentsForDisplay(
                                    { segments: [segment] },
                                    closingMap[day.dayName]
                                  );
                                  return (
                                    <div
                                      key={`${label}-${slotIdx}-segment-${segIdx}`}
                                      className="flex items-center gap-2 text-[12px] text-gray-800"
                                    >
                                      <span className="w-28 text-gray-500">
                                        {timeLabel}
                                      </span>
                                      <span
                                        className={
                                          employeeName === "Unassigned"
                                            ? "text-red-500"
                                            : "font-semibold text-gray-800"
                                        }
                                      >
                                        {employeeName}
                                      </span>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ))}
                  </div>
                </div>
              )
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}


