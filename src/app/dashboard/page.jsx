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

export const dynamic = "force-dynamic";

export default async function Dashboard() {
  const today = new Date();
  const dayOfWeek = today.getDay();
  const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  const monday = new Date(today);
  monday.setDate(today.getDate() + mondayOffset);

  const weekDays = Array.from({ length: 7 }).map((_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    const iso = d.toISOString().slice(0, 10);
    const dayName = d.toLocaleDateString(undefined, { weekday: "long" });
    return { date: iso, dayName };
  });

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

  existingRosters.forEach((roster) => {
    const dayRosters = rostersByDay[roster.shift_date];
    if (dayRosters && roster.role) {
      dayRosters[roster.role].push({
        id: roster.id,
        employee_name:
          employeesMap.get(roster.employee_id) ||
          `Employee ${roster.employee_id}`,
        shift_start: roster.shift_start,
        shift_end: roster.shift_end,
      });
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
  function slotDurationMins(start, end, endIsClosing, closing) {
    if (!start) return 0;
    if (endIsClosing) {
      if (!closing) return 0;
      return parseTimeToMins(closing) - parseTimeToMins(start);
    }
    if (!end) return 0;
    const s = parseTimeToMins(start);
    const e = parseTimeToMins(end);
    if (s == null || e == null) return 0;
    let diff = e - s;
    if (diff < 0) diff += 24 * 60;
    return diff;
  }

  const hoursByDay = weekDays.map((day) => {
    const req = requirements[day.dayName] || {};
    let mins = 0;
    (req.chef_slots || []).forEach((slot, i) => {
      const r = rostersByDay[day.date]?.Chef?.[i];
      if (!r) return;
      if (!slot.start) return;
      let end = slot.end;
      let isClosing = slot.end_is_closing;
      if (isClosing) end = closingMap[day.dayName];
      mins += slotDurationMins(
        slot.start,
        end,
        isClosing,
        closingMap[day.dayName]
      );
    });
    (req.kitchen_slots || []).forEach((slot, i) => {
      const r = rostersByDay[day.date]?.["Kitchen Hand"]?.[i];
      if (!r) return;
      if (!slot.start) return;
      let end = slot.end;
      let isClosing = slot.end_is_closing;
      if (isClosing) end = closingMap[day.dayName];
      mins += slotDurationMins(
        slot.start,
        end,
        isClosing,
        closingMap[day.dayName]
      );
    });
    return mins / 60;
  });
  const weekHours = hoursByDay.reduce((a, b) => a + b, 0);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-2xl">Weekly Roster Dashboard</CardTitle>
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
            {weekDays.map((day, idx) => {
              const chefSlots =
                (requirements[day.dayName] || {}).chef_slots || [];
              const khSlots =
                (requirements[day.dayName] || {}).kitchen_slots || [];
              const assignedChefs = rostersByDay[day.date]?.Chef || [];
              const assignedKH = rostersByDay[day.date]?.["Kitchen Hand"] || [];

              return (
                <div
                  key={day.date}
                  className="rounded-lg border border-gray-200"
                >
                  <div className="border-b px-4 py-3 text-sm font-medium text-gray-800 bg-gray-50">
                    {day.dayName} — {day.date}
                    <span className="ml-2 text-xs font-normal text-gray-500">
                      Total Hours: {hoursByDay[idx].toFixed(1)}
                    </span>
                  </div>
                  <div className="grid gap-4 p-4 sm:grid-cols-2">
                    <div className="space-y-3">
                      <div className="font-semibold text-gray-700">
                        Chef ({chefSlots.length})
                      </div>
                      {chefSlots.map((slot, i) => {
                        let end = slot.end;
                        let isClosing = slot.end_is_closing;
                        if (isClosing) end = closingMap[day.dayName];
                        const label = `C${i + 1}`;
                        const timeLabel =
                          slot.start && isClosing
                            ? `${String(slot.start).slice(0, 5)} - closing`
                            : slot.start && end
                            ? `${String(slot.start).slice(0, 5)} - ${String(
                                end
                              ).slice(0, 5)}`
                            : "";
                        const employeeName =
                          assignedChefs[i]?.employee_name || "Unassigned";
                        return (
                          <div
                            key={i}
                            className="flex items-center gap-2 text-[12px] text-gray-800"
                          >
                            <span className="w-8 inline-block text-gray-500 font-mono">
                              {label}
                            </span>
                            <span className="w-32 inline-block text-gray-500">
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
                    <div className="space-y-3">
                      <div className="font-semibold text-gray-700">
                        Kitchen Hand ({khSlots.length})
                      </div>
                      {khSlots.map((slot, i) => {
                        let end = slot.end;
                        let isClosing = slot.end_is_closing;
                        if (isClosing) end = closingMap[day.dayName];
                        const label = `KH${i + 1}`;
                        const timeLabel =
                          slot.start && isClosing
                            ? `${String(slot.start).slice(0, 5)} - closing`
                            : slot.start && end
                            ? `${String(slot.start).slice(0, 5)} - ${String(
                                end
                              ).slice(0, 5)}`
                            : "";
                        const employeeName =
                          assignedKH[i]?.employee_name || "Unassigned";
                        return (
                          <div
                            key={i}
                            className="flex items-center gap-2 text-[12px] text-gray-800"
                          >
                            <span className="w-8 inline-block text-gray-500 font-mono">
                              {label}
                            </span>
                            <span className="w-32 inline-block text-gray-500">
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
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}


