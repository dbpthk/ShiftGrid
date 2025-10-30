import React from "react";
import db from "@/db";
import { rosters, employees } from "@/db/schema";
import { inArray } from "drizzle-orm";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const dynamic = "force-dynamic";

export default async function RosterPage() {
  const rows = await db
    .select({
      id: rosters.id,
      shift_date: rosters.shift_date,
      shift_start: rosters.shift_start,
      shift_end: rosters.shift_end,
      role: rosters.role,
      employee_id: rosters.employee_id,
    })
    .from(rosters);

  // Fetch employee names for the roster entries
  const employeeIds = Array.from(new Set(rows.map((r) => r.employee_id)));
  const employeesRows = employeeIds.length
    ? await db
        .select()
        .from(employees)
        .where(inArray(employees.id, employeeIds))
    : [];
  // Note: For simplicity, above uses single eq if only one, otherwise we could expand to in-array support
  const idToName = new Map(employeesRows.map((e) => [e.id, e.name]));

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">Rosters</CardTitle>
        </CardHeader>
        <CardContent>
          {rows.length === 0 ? (
            <p className="text-sm text-gray-600">No rosters set yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                      Date
                    </th>
                    <th className="px-4 py-2 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                      Start
                    </th>
                    <th className="px-4 py-2 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                      End
                    </th>
                    <th className="px-4 py-2 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                      Role
                    </th>
                    <th className="px-4 py-2 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                      Employee
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white">
                  {rows.map((r) => (
                    <tr key={r.id}>
                      <td className="whitespace-nowrap px-4 py-2 text-sm text-gray-900">
                        {String(r.shift_date)}
                      </td>
                      <td className="whitespace-nowrap px-4 py-2 text-sm text-gray-700">
                        {String(r.shift_start)}
                      </td>
                      <td className="whitespace-nowrap px-4 py-2 text-sm text-gray-700">
                        {String(r.shift_end)}
                      </td>
                      <td className="whitespace-nowrap px-4 py-2 text-sm text-gray-700">
                        {r.role || "-"}
                      </td>
                      <td className="whitespace-nowrap px-4 py-2 text-sm text-gray-700">
                        {idToName.get(r.employee_id) || r.employee_id}
                      </td>
                    </tr>
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
