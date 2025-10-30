import React from "react";
import db from "@/db";
import { business_requirements } from "@/db/schema";
import { desc } from "drizzle-orm";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import BusinessRequirementForm from "./BusinessRequirementForm";
import RequirementRow from "./RequirementRow";

export const dynamic = "force-dynamic";

export default async function BusinessRequirementsPage() {
  const rows = await db
    .select()
    .from(business_requirements)
    .orderBy(desc(business_requirements.id));

  return (
    <div className="space-y-6">
      <BusinessRequirementForm />

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
                    <th className="px-4 py-2 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                      Day
                    </th>
                    <th className="px-4 py-2 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                      Chefs
                    </th>
                    <th className="px-4 py-2 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                      Kitchen Hands
                    </th>
                    <th className="px-4 py-2 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                      Notes
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white">
                  {rows.map((r) => (
                    <RequirementRow key={r.id} row={r} />
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
