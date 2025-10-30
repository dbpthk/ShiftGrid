import React from "react";
import db from "@/db";
import { employees, employee_availability } from "@/db/schema";
import { desc, inArray } from "drizzle-orm";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import EmployeeRow from "./EmployeeRow";

export const dynamic = "force-dynamic";

export default async function EmployeesPage() {
  const rows = await db
    .select()
    .from(employees)
    .orderBy(desc(employees.created_at));

  const employeeIds = rows.map((e) => e.id);
  const availabilityRows = employeeIds.length
    ? await db
        .select()
        .from(employee_availability)
        .where(inArray(employee_availability.employee_id, employeeIds))
    : [];

  const idToDays = new Map();
  for (const r of availabilityRows) {
    if (!r.is_available) continue;
    if (!idToDays.has(r.employee_id)) idToDays.set(r.employee_id, []);
    idToDays.get(r.employee_id).push(r.day_of_week);
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">Employees</CardTitle>
        </CardHeader>
        <CardContent>
          {rows.length === 0 ? (
            <p className="text-sm text-gray-600">No employees yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-2 py-2 text-left text-xs font-medium uppercase tracking-wider text-gray-500 sm:px-4">
                      Name
                    </th>
                    <th className="px-2 py-2 text-left text-xs font-medium uppercase tracking-wider text-gray-500 sm:px-4">
                      Role
                    </th>
                    <th className="hidden px-2 py-2 text-left text-xs font-medium uppercase tracking-wider text-gray-500 sm:table-cell sm:px-4">
                      Email
                    </th>
                    <th className="hidden px-2 py-2 text-left text-xs font-medium uppercase tracking-wider text-gray-500 sm:table-cell sm:px-4">
                      Phone
                    </th>
                    <th className="px-4 py-2 text-left text-xs font-medium uppercase tracking-wider text-gray-500 sm:px-4">
                      Availability
                    </th>
                    <th className="hidden px-2 py-2 text-left text-xs font-medium uppercase tracking-wider text-gray-500 sm:table-cell sm:px-4">
                      Added
                    </th>
                    <th className="px-2 py-2 text-right text-xs font-medium uppercase tracking-wider text-gray-500 sm:px-4">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white">
                  {rows.map((e) => (
                    <EmployeeRow
                      key={e.id}
                      row={e}
                      availabilityDays={idToDays.get(e.id) || []}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
