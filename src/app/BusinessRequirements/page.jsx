import db from "@/db";
import { business_requirements } from "@/db/schema";
import { desc } from "drizzle-orm";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import BusinessHoursCard from "./BusinessHoursCard";
import RequirementRow from "./RequirementRow";
import BusinessRequirementForm from "./BusinessRequirementForm";

export const dynamic = "force-dynamic";

export default async function BusinessRequirementsPage() {
  const rows = await db
    .select()
    .from(business_requirements)
    .orderBy(desc(business_requirements.id));
  const usedDays = rows.map((r) => r.day_of_week);

  return (
    <div className="space-y-6">
      <BusinessHoursCard />
      <BusinessRequirementForm usedDays={usedDays} />

      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">Existing Requirements</CardTitle>
        </CardHeader>
        <CardContent>
          {rows.length === 0 ? (
            <p className="text-sm text-gray-600">No requirements yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-2 py-2 text-left text-xs font-medium uppercase tracking-wider text-gray-500 sm:px-4">
                      Day
                    </th>
                    <th className="px-2 py-2 text-left text-[10px] sm:text-xs font-medium uppercase tracking-wider text-gray-500 sm:px-4">
                      Chefs — default range + per-chef slots
                    </th>
                    <th className="px-2 py-2 text-left text-[10px] sm:text-xs font-medium uppercase tracking-wider text-gray-500 sm:px-4">
                      Kitchen Hand — default range + per-person slots
                    </th>
                    <th className="hidden px-2 py-2 text-left text-xs font-medium uppercase tracking-wider text-gray-500 sm:table-cell sm:px-4">
                      Notes
                    </th>
                    <th className="px-2 py-2 text-right text-xs font-medium uppercase tracking-wider text-gray-500 sm:px-4">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white">
                  {rows.map((r) => (
                    <RequirementRow key={r.id} row={r} usedDays={usedDays} />
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
