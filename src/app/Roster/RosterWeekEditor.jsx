"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  createSlotArray,
  formatSegmentsForDisplay,
  mapRosterEntriesToSlots,
  withSegments,
} from "@/lib/slot-utils";

export default function RosterWeekEditor({
  weekDays,
  employees,
  employeeAvailability,
  requirements,
  existing,
  weekLabel,
}) {
  const router = useRouter();
  const [saving, setSaving] = React.useState(false);

  // Build map for existing roster: key = date|role|index -> roster row or null
  const existingMap = new Map();
  const sortedExisting = Array.isArray(existing)
    ? [...existing].sort((a, b) => {
        const dateCompare = String(a.shift_date).localeCompare(
          String(b.shift_date)
        );
        if (dateCompare !== 0) return dateCompare;
        const roleCompare = String(a.role || "").localeCompare(
          String(b.role || "")
        );
        if (roleCompare !== 0) return roleCompare;
        const startCompare = String(a.shift_start || "").localeCompare(
          String(b.shift_start || "")
        );
        if (startCompare !== 0) return startCompare;
        return (a.id || 0) - (b.id || 0);
      })
    : [];
  for (const r of sortedExisting) {
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
        chef_slots: [],
        kitchen_slots: [],
      };

      const chefSlots = createSlotArray(req.chef_slots, req.required_chefs);
      const kitchenSlots = createSlotArray(
        req.kitchen_slots,
        req.required_kitchen_hands
      );

      const chefEntryGroups = mapRosterEntriesToSlots(
        chefSlots,
        existingMap.get(`${day.date}|Chef`) || []
      );
      const kitchenEntryGroups = mapRosterEntriesToSlots(
        kitchenSlots,
        existingMap.get(`${day.date}|Kitchen Hand`) || []
      );

      s[day.date] = {
        Chef: chefEntryGroups.map((group) =>
          Array.isArray(group)
            ? group.map((entry) => entry?.employee_id ?? null)
            : []
        ),
        "Kitchen Hand": kitchenEntryGroups.map((group) =>
          Array.isArray(group)
            ? group.map((entry) => entry?.employee_id ?? null)
            : []
        ),
      };
    }
    return s;
  });

  const handleChange = (date, role, slotIdx, segmentIdx, value) => {
    setState((prev) => {
      const dayState = { ...(prev[date] || {}) };
      const roleState = Array.isArray(dayState[role])
        ? dayState[role].map((slotArr) =>
            Array.isArray(slotArr) ? [...slotArr] : []
          )
        : [];

      while (roleState.length <= slotIdx) {
        roleState.push([]);
      }

      const slotAssignments = Array.isArray(roleState[slotIdx])
        ? [...roleState[slotIdx]]
        : [];
      while (slotAssignments.length <= segmentIdx) {
        slotAssignments.push(null);
      }
      slotAssignments[segmentIdx] = value ? Number(value) : null;
      roleState[slotIdx] = slotAssignments;

      dayState[role] = roleState;

      return {
        ...prev,
        [date]: dayState,
      };
    });
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
        return (
          empRole.includes("chef") ||
          empRole.includes("head") ||
          empRole.includes("kitchen") ||
          empRole.includes("hand")
        );
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

  // Accept closingMap as a prop. If not passed, compute a fake one as fallback.
  // (when you wire this up, pass closingMap prop down from page)
  const [closingMap, setClosingMap] = React.useState({});
  React.useEffect(() => {
    fetch("/api/business-hours")
      .then((r) => r.json())
      .then((data) => {
        const m = {};
        if (Array.isArray(data?.data))
          data.data.forEach((row) => (m[row.day_of_week] = row.closing_time));
        setClosingMap(m);
      });
  }, []);

  function parseTimeToMins(str) {
    if (!str) return null;
    const [h, m] = str.split(":");
    return Number(h) * 60 + Number(m);
  }

  const onSave = async () => {
    setSaving(true);
    try {
      // Flatten and send creates/updates; for simplicity, we delete all for the range and re-create
      // Delete existing in range (optional: you can refine to day-by-day); here we delete per day before creating
      for (const day of weekDays) {
        const toDelete = existing.filter((r) => r.shift_date === day.date);
        for (const r of toDelete) {
          await fetch(`/api/rosters?id=${r.id}`, { method: "DELETE" });
        }
      }

      for (const day of weekDays) {
        const dayReq = requirements[day.dayName] || {};
        const chefSlots = createSlotArray(
          dayReq.chef_slots,
          dayReq.required_chefs
        );
        const kitchenSlots = createSlotArray(
          dayReq.kitchen_slots,
          dayReq.required_kitchen_hands
        );

        const slotGroups = [
          {
            role: "Chef",
            assignments: state[day.date]?.["Chef"] || [],
            slots: chefSlots,
          },
          {
            role: "Kitchen Hand",
            assignments: state[day.date]?.["Kitchen Hand"] || [],
            slots: kitchenSlots,
          },
        ];

        const formatForDb = (time) => {
          if (!time) return null;
          return time.length === 5 ? `${time}:00` : time;
        };

        for (const { role, assignments, slots } of slotGroups) {
          for (let idx = 0; idx < slots.length; idx += 1) {
            const slot =
              slots[idx] ||
              withSegments({
                segments: [
                  {
                    start: null,
                    end: null,
                    end_is_closing: false,
                  },
                ],
              });
            const slotAssignments = Array.isArray(assignments[idx])
              ? assignments[idx]
              : [];
            const segments = slot.segments || [];
            const closing = closingMap[day.dayName];

            for (let segIdx = 0; segIdx < segments.length; segIdx += 1) {
              const segment = segments[segIdx];
              const employee_id = slotAssignments[segIdx];
              if (!employee_id || !segment?.start) continue;
              const shift_start = formatForDb(segment.start);
              let shift_end = segment.end_is_closing
                ? formatForDb(closing)
                : formatForDb(segment.end);
              if (!shift_end) shift_end = formatForDb(segment.end);
              if (!shift_start || !shift_end) continue;

              await fetch("/api/rosters", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  employee_id,
                  shift_date: day.date,
                  shift_start,
                  shift_end,
                  role,
                }),
              });
            }
          }
        }
      }
      router.refresh();
      toast.success("Roster saved");
    } catch (error) {
      console.error("Failed to save roster", error);
      toast.error("Failed to save roster. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  // Calculate hours per day/week summing only assigned slots with correct closing
  const dayHours = weekDays.map((day) => {
    const req = requirements[day.dayName] || {};
    let mins = 0;
    const closing = closingMap[day.dayName];
    const chefSlots = createSlotArray(req.chef_slots, req.required_chefs);
    const kitchenSlots = createSlotArray(
      req.kitchen_slots,
      req.required_kitchen_hands
    );

    chefSlots.forEach((slot, slotIdx) => {
      const slotAssignments = Array.isArray(
        state[day.date]?.["Chef"]?.[slotIdx]
      )
        ? state[day.date]["Chef"][slotIdx]
        : [];
      slot.segments?.forEach((segment, segIdx) => {
        if (!slotAssignments?.[segIdx]) return;
        if (!segment?.start) return;
        const start = parseTimeToMins(segment.start);
        if (start == null) return;
        const end = segment.end_is_closing
          ? parseTimeToMins(closing)
          : parseTimeToMins(segment.end);
        if (end == null) return;
        let diff = end - start;
        if (diff < 0) diff += 24 * 60;
        mins += diff;
      });
    });

    kitchenSlots.forEach((slot, slotIdx) => {
      const slotAssignments = Array.isArray(
        state[day.date]?.["Kitchen Hand"]?.[slotIdx]
      )
        ? state[day.date]["Kitchen Hand"][slotIdx]
        : [];
      slot.segments?.forEach((segment, segIdx) => {
        if (!slotAssignments?.[segIdx]) return;
        if (!segment?.start) return;
        const start = parseTimeToMins(segment.start);
        if (start == null) return;
        const end = segment.end_is_closing
          ? parseTimeToMins(closing)
          : parseTimeToMins(segment.end);
        if (end == null) return;
        let diff = end - start;
        if (diff < 0) diff += 24 * 60;
        mins += diff;
      });
    });

    return mins / 60;
  });
  const weekTotal = dayHours.reduce((a, b) => a + b, 0);

  return (
    <div className="space-y-6">
      {weekLabel ? (
        <div className="text-sm font-medium text-gray-700">Week: {weekLabel}</div>
      ) : null}
      <div className="text-right text-xs text-gray-600 font-semibold">
        TOTAL ROSTERED HOURS FOR WEEK: {weekTotal.toFixed(1)}
      </div>
      {weekDays.map((day, dayIdx) => {
        const req = requirements[day.dayName] || {
          required_chefs: 0,
          required_kitchen_hands: 0,
        };
        return (
          <div
            key={day.date}
            className="rounded-lg border border-gray-200 mb-4"
          >
            <div className="border-b px-4 py-2 text-sm font-medium text-gray-800">
              {day.dayName} — {day.date}
              <span className="ml-2 text-xs font-normal text-gray-500">
                Total Hours: {dayHours[dayIdx].toFixed(1)}
              </span>
            </div>
            <div className="grid gap-4 p-4 sm:grid-cols-2">
              {[
                {
                  label: "Chef",
                  slots: createSlotArray(req.chef_slots, req.required_chefs),
                },
                {
                  label: "Kitchen Hand",
                  slots: createSlotArray(
                    req.kitchen_slots,
                    req.required_kitchen_hands
                  ),
                },
              ].map(({ label, slots }) => (
                <div key={label} className="space-y-3">
                  <div className="text-sm font-medium text-gray-700">
                    {label} ({slots.length})
                  </div>
                  <div className="space-y-3">
                    {slots.map((slot, slotIdx) => {
                      const segments = slot.segments || [];
                      const slotAssignments = Array.isArray(
                        state[day.date]?.[label]?.[slotIdx]
                      )
                        ? state[day.date][label][slotIdx]
                        : [];
                      const slotHeader = formatSegmentsForDisplay(
                        slot,
                        closingMap[day.dayName]
                      );

                      return (
                        <div
                          key={`${label}-${slotIdx}`}
                          className="rounded-md border border-gray-200 p-3 space-y-3"
                        >
                          <div className="text-[11px] font-semibold uppercase text-gray-600">
                            {label === "Chef" ? `Chef ${slotIdx + 1}` : `KH ${slotIdx + 1}`}
                            {slotHeader && (
                              <span className="ml-2 text-gray-400 normal-case">
                                {slotHeader}
                              </span>
                            )}
                          </div>
                          <div className="space-y-2">
                            {segments.map((segment, segIdx) => {
                              const segmentLabel =
                                segments.length > 1 ? `Segment ${segIdx + 1}` : "Shift";
                              const segmentTime = formatSegmentsForDisplay(
                                { segments: [segment] },
                                closingMap[day.dayName]
                              );
                              const currentValue =
                                slotAssignments?.[segIdx] ?? null;

                              const dayAssignments = state[day.date] || {};
                              const assignedIds = [];
                              Object.entries(dayAssignments).forEach(
                                ([roleKey, roleSlots]) => {
                                  (roleSlots || []).forEach((slotArr, sIdx) => {
                                    if (!Array.isArray(slotArr)) return;
                                    slotArr.forEach((val, sSegIdx) => {
                                      if (
                                        val &&
                                        !(
                                          roleKey === label &&
                                          sIdx === slotIdx &&
                                          sSegIdx === segIdx
                                        )
                                      ) {
                                        assignedIds.push(val);
                                      }
                                    });
                                  });
                                }
                              );

                              const availableEmployees = getAvailableEmployees(
                                day.dayName,
                                label
                              );

                              return (
                                <div
                                  key={`${label}-${slotIdx}-segment-${segIdx}`}
                                  className="space-y-1"
                                >
                                  <label className="block text-[11px] text-gray-500">
                                    {segmentLabel}
                                    {segmentTime && (
                                      <span className="ml-2 text-gray-400">
                                        {segmentTime}
                                      </span>
                                    )}
                                  </label>
                                  <select
                                    value={
                                      currentValue != null
                                        ? String(currentValue)
                                        : ""
                                    }
                                    onChange={(e) =>
                                      handleChange(
                                        day.date,
                                        label,
                                        slotIdx,
                                        segIdx,
                                        e.target.value
                                      )
                                    }
                                    className="block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-xs sm:text-sm text-gray-900 shadow-sm focus:border-gray-500 focus:outline-none"
                                  >
                                    <option value="">Unassigned</option>
                                    {availableEmployees.map((emp) => {
                                      const isAssigned = assignedIds.includes(emp.id);
                                      return (
                                        <option
                                          key={emp.id}
                                          value={String(emp.id)}
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
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })}

      <div className="flex justify-end">
        <Button onClick={onSave} disabled={saving}>
          {saving ? "Saving..." : "Save Week"}
        </Button>
      </div>
    </div>
  );
}