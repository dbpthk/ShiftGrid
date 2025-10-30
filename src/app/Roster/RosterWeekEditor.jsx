"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";

export default function RosterWeekEditor({
  weekDays,
  employees,
  employeeAvailability,
  requirements,
  existing,
}) {
  const router = useRouter();
  const [saving, setSaving] = React.useState(false);

  // Build map for existing roster: key = date|role|index -> roster row or null
  const existingKey = (date, role, idx) => `${date}|${role}|${idx}`;
  const existingMap = new Map();
  for (const r of existing) {
    // collapse identical role entries of same day in order
    const key = `${r.shift_date}|${r.role || ""}`;
    if (!existingMap.has(key)) existingMap.set(key, []);
    existingMap.get(key).push(r);
  }

  const [state, setState] = React.useState(() => {
    const s = {};
    for (const day of weekDays) {
      const req = requirements[day.dayName] || {
        required_chefs: 0,
        required_kitchen_hands: 0,
      };
      const chefSlots = req.required_chefs || 0;
      const khSlots = req.required_kitchen_hands || 0;
      const exChef = existingMap.get(`${day.date}|Chef`) || [];
      const exKh = existingMap.get(`${day.date}|Kitchen Hand`) || [];
      s[day.date] = {
        Chef: Array.from({ length: chefSlots }).map(
          (_, i) => exChef[i]?.employee_id || null
        ),
        "Kitchen Hand": Array.from({ length: khSlots }).map(
          (_, i) => exKh[i]?.employee_id || null
        ),
      };
    }
    return s;
  });

  const handleChange = (date, role, idx, value) => {
    setState((prev) => ({
      ...prev,
      [date]: {
        ...prev[date],
        [role]: (prev[date]?.[role] || []).map((v, i) =>
          i === idx ? (value ? Number(value) : null) : v
        ),
      },
    }));
  };

  // Helper function to get available employees for a specific day and role
  const getAvailableEmployees = (dayName, role) => {
    const availableEmployees = employees.filter((emp) => {
      const empDays = employeeAvailability.get(emp.id) || [];
      const isAvailable = empDays.includes(dayName);

      if (!isAvailable) return false;

      // Role compatibility check
      const empRole = emp.role.toLowerCase();
      if (role === "Chef") {
        return empRole.includes("chef") || empRole.includes("head");
      } else if (role === "Kitchen Hand") {
        return (
          empRole.includes("chef") ||
          empRole.includes("kitchen") ||
          empRole.includes("hand")
        );
      }
      return false;
    });

    return availableEmployees;
  };

  const onSave = async () => {
    setSaving(true);
    try {
      // Flatten and send creates/updates; for simplicity, we delete all for the range and re-create
      const from = weekDays[0]?.date;
      const to = weekDays[weekDays.length - 1]?.date;
      // Delete existing in range (optional: you can refine to day-by-day); here we delete per day before creating
      for (const day of weekDays) {
        const toDelete = existing.filter((r) => r.shift_date === day.date);
        for (const r of toDelete) {
          await fetch(`/api/rosters?id=${r.id}`, { method: "DELETE" });
        }
      }

      const DEFAULT_START = "09:00:00";
      const DEFAULT_END = "17:00:00";
      for (const day of weekDays) {
        for (const role of ["Chef", "Kitchen Hand"]) {
          const arr = state[day.date]?.[role] || [];
          for (const employee_id of arr) {
            if (!employee_id) continue;
            await fetch("/api/rosters", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                employee_id,
                shift_date: day.date,
                shift_start: DEFAULT_START,
                shift_end: DEFAULT_END,
                role,
              }),
            });
          }
        }
      }
      router.refresh();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {weekDays.map((day) => {
        const req = requirements[day.dayName] || {
          required_chefs: 0,
          required_kitchen_hands: 0,
        };
        return (
          <div key={day.date} className="rounded-lg border border-gray-200">
            <div className="border-b px-4 py-2 text-sm font-medium text-gray-800">
              {day.dayName} — {day.date}
            </div>
            <div className="grid gap-4 p-4 sm:grid-cols-2">
              {[
                {
                  label: "Chef",
                  count:
                    (req.chef_slots && req.chef_slots.length) ||
                    req.required_chefs ||
                    0,
                  slots: req.chef_slots || [],
                },
                {
                  label: "Kitchen Hand",
                  count:
                    (req.kitchen_slots && req.kitchen_slots.length) ||
                    req.required_kitchen_hands ||
                    0,
                  slots: req.kitchen_slots || [],
                },
              ].map(({ label, count, slots }) => (
                <div key={label} className="space-y-2">
                  <div className="text-sm font-medium text-gray-700">
                    {label} ({count})
                  </div>
                  <div className="space-y-2">
                    {Array.from({ length: count || 0 }).map((_, idx) => {
                      // Compute assigned IDs from ALL roles for this day except the current select slot
                      const dayAssignments = state[day.date] || {};
                      // Build a flat list of all assigned employee IDs for this day, excluding the current slot
                      let assignedIds = [];
                      Object.entries(dayAssignments).forEach(
                        ([roleKey, arr]) => {
                          arr.forEach((v, i) => {
                            // Exclude the current selector index + role
                            if (!(roleKey === label && i === idx) && v)
                              assignedIds.push(v);
                          });
                        }
                      );
                      const availableEmployees = getAvailableEmployees(
                        day.dayName,
                        label
                      );
                      const slotInfo = slots[idx] || {};
                      const slotLabel =
                        label === "Chef"
                          ? `Chef ${idx + 1}`
                          : label === "Kitchen Hand"
                          ? `KH ${idx + 1}`
                          : label + ` ${idx + 1}`;
                      const slotTime =
                        slotInfo.start ||
                        slotInfo.end ||
                        slotInfo.end_is_closing
                          ? `${
                              slotInfo.start
                                ? String(slotInfo.start).slice(0, 5)
                                : "--"
                            } - ${
                              slotInfo.end_is_closing
                                ? "closing"
                                : slotInfo.end
                                ? String(slotInfo.end).slice(0, 5)
                                : "--"
                            }`
                          : "";
                      return (
                        <div key={idx}>
                          <label className="block text-[11px] text-gray-500 mb-0.5">
                            {slotLabel}
                            {slotTime && (
                              <span className="ml-2 text-gray-400 font-normal">
                                {slotTime}
                              </span>
                            )}
                          </label>
                          <select
                            value={state[day.date]?.[label]?.[idx] || ""}
                            onChange={(e) =>
                              handleChange(day.date, label, idx, e.target.value)
                            }
                            className="block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-xs sm:text-sm text-gray-900 shadow-sm focus:border-gray-500 focus:outline-none"
                          >
                            <option value="">Unassigned</option>
                            {availableEmployees.map((emp) => {
                              const isAssigned = assignedIds.includes(emp.id);
                              return (
                                <option
                                  key={emp.id}
                                  value={emp.id}
                                  disabled={isAssigned}
                                >
                                  {emp.name} ({emp.role})
                                  {isAssigned ? " (already assigned)" : ""}
                                </option>
                              );
                            })}
                            {availableEmployees.length === 0 && (
                              <option value="" disabled>
                                No available employees
                              </option>
                            )}
                          </select>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })}

      <div>
        <Button onClick={onSave} disabled={saving}>
          {saving ? "Saving..." : "Save Week"}
        </Button>
      </div>
    </div>
  );
}
