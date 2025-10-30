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
import RosterWeekEditor from "./RosterWeekEditor";
import ExportRosterButton from "./ExportRosterButton";

export const dynamic = "force-dynamic";

export default async function RosterPage() {
  const today = new Date();
  // Find the Monday of current week
  const dayOfWeek = today.getDay();
  const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek; // Sunday is 0, so -6 to get Monday
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

  // Load existing rosters in the next 7 days
  const existing = await db.select().from(rosters);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-2xl">Roster - Next 7 Days</CardTitle>
            <ExportRosterButton
              weekDays={weekDays}
              employees={allEmployees}
              employeeAvailability={employeeAvailability}
              requirements={requirements}
              existing={existing}
            />
          </div>
        </CardHeader>
        <CardContent>
          <RosterWeekEditor
            weekDays={weekDays}
            employees={allEmployees}
            employeeAvailability={employeeAvailability}
            requirements={requirements}
            existing={existing}
          />
        </CardContent>
      </Card>
    </div>
  );
}
