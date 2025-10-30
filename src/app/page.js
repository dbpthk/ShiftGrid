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
import ExportRosterButton from "./Roster/ExportRosterButton";
import ExportTableButton from "./Roster/ExportTableButton";

export const dynamic = "force-dynamic";

export default async function Dashboard() {
  const today = new Date();
  // Find the Monday of current week
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

  // Load existing rosters for the week
  const weekDates = weekDays.map((d) => d.date);
  const existingRosters = await db
    .select()
    .from(rosters)
    .where(inArray(rosters.shift_date, weekDates));

  // Get employee names
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

  // Group rosters by day and role
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
            {weekDays.map((day) => {
              const req = requirements[day.dayName] || {
                required_chefs: 0,
                required_kitchen_hands: 0,
              };
              const dayRosters = rostersByDay[day.date];

              return (
                <div
                  key={day.date}
                  className="rounded-lg border border-gray-200"
                >
                  <div className="border-b px-4 py-3 text-sm font-medium text-gray-800 bg-gray-50">
                    {day.dayName} — {day.date}
                  </div>
                  <div className="grid gap-4 p-4 sm:grid-cols-2">
                    {[
                      {
                        label: "Chef",
                        count: req.required_chefs,
                        rosters: dayRosters.Chef,
                      },
                      {
                        label: "Kitchen Hand",
                        count: req.required_kitchen_hands,
                        rosters: dayRosters["Kitchen Hand"],
                      },
                    ].map(({ label, count, rosters }) => (
                      <div key={label} className="space-y-2">
                        <div className="text-sm font-medium text-gray-700">
                          {label} ({rosters.length}/{count})
                        </div>
                        <div className="space-y-1">
                          {rosters.length > 0 ? (
                            rosters.map((roster, idx) => (
                              <div
                                key={idx}
                                className="flex items-center justify-between p-2 bg-green-50 rounded-md border border-green-200"
                              >
                                <span className="text-sm font-medium text-green-800">
                                  {roster.employee_name}
                                </span>
                                <span className="text-xs text-green-600">
                                  {String(roster.shift_start)} -{" "}
                                  {String(roster.shift_end)}
                                </span>
                              </div>
                            ))
                          ) : (
                            <div className="p-2 bg-gray-50 rounded-md border border-gray-200">
                              <span className="text-sm text-gray-500">
                                No assignments
                              </span>
                            </div>
                          )}
                          {Array.from({
                            length: Math.max(0, count - rosters.length),
                          }).map((_, idx) => (
                            <div
                              key={`empty-${idx}`}
                              className="p-2 bg-red-50 rounded-md border border-red-200"
                            >
                              <span className="text-sm text-red-500">
                                Unassigned
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
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
