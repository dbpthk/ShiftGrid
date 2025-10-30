"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";

const DAYS = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];

export default function RequirementRow({ row }) {
  const router = useRouter();
  const [isEditing, setIsEditing] = React.useState(false);
  const [form, setForm] = React.useState({
    day_of_week: row.day_of_week || "",
    required_chefs: row.required_chefs ?? 0,
    required_kitchen_hands: row.required_kitchen_hands ?? 0,
    chef_start: row.chef_start || "",
    chef_end: row.chef_end || "",
    kitchen_start: row.kitchen_start || "",
    kitchen_end: row.kitchen_end || "",
    notes: row.notes || "",
  });
  const [saving, setSaving] = React.useState(false);

  const onChange = (e) => {
    const { name, value } = e.target;
    setForm((f) => ({
      ...f,
      [name]: name.includes("required_") ? Number(value) : value,
    }));
  };

  const onSave = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/business-requirements", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: row.id, ...form }),
      });
      const result = await res.json().catch(() => ({}));
      if (res.ok && result?.success) {
        router.refresh();
        setIsEditing(false);
      } else {
        alert(result?.error || "Failed to update");
      }
    } catch (e) {
      alert("Network error");
    } finally {
      setSaving(false);
    }
  };

  if (!isEditing) {
    return (
      <tr>
        <td className="px-2 py-2 text-xs sm:text-sm text-gray-900 sm:px-4">
          {row.day_of_week}
        </td>
        <td className="px-2 py-2 text-xs sm:text-sm text-gray-700 sm:px-4">
          {row.required_chefs}
        </td>
        <td className="hidden px-2 py-2 text-xs sm:table-cell sm:text-sm text-gray-700 sm:px-4">
          {row.chef_start && row.chef_end
            ? `${String(row.chef_start).slice(0, 5)} - ${String(
                row.chef_end
              ).slice(0, 5)}`
            : "-"}
        </td>
        <td className="px-2 py-2 text-xs sm:text-sm text-gray-700 sm:px-4">
          {row.required_kitchen_hands}
        </td>
        <td className="hidden px-2 py-2 text-xs sm:table-cell sm:text-sm text-gray-700 sm:px-4">
          {row.kitchen_start && row.kitchen_end
            ? `${String(row.kitchen_start).slice(0, 5)} - ${String(
                row.kitchen_end
              ).slice(0, 5)}`
            : "-"}
        </td>
        <td className="hidden px-2 py-2 text-xs sm:table-cell sm:text-sm text-gray-700 sm:px-4">
          {row.notes || "-"}
        </td>
        <td className="px-2 py-2 text-right sm:px-4">
          <Button onClick={() => setIsEditing(true)} size="sm">
            Edit
          </Button>
        </td>
      </tr>
    );
  }

  return (
    <tr>
      <td className="px-2 py-2 text-xs sm:text-sm text-gray-900 sm:px-4">
        <select
          name="day_of_week"
          value={form.day_of_week}
          onChange={onChange}
          className="w-full rounded-md border border-gray-300 bg-white px-2 py-1 text-xs sm:text-sm"
        >
          <option value="" disabled>
            Select day
          </option>
          {DAYS.map((d) => (
            <option key={d} value={d}>
              {d}
            </option>
          ))}
        </select>
      </td>
      <td className="px-2 py-2 text-xs sm:text-sm text-gray-700 sm:px-4">
        <input
          type="number"
          min={0}
          name="required_chefs"
          value={form.required_chefs}
          onChange={onChange}
          className="w-full max-w-20 rounded-md border border-gray-300 px-2 py-1 text-xs sm:text-sm"
        />
      </td>
      <td className="hidden px-2 py-2 text-xs sm:table-cell sm:text-sm text-gray-700 sm:px-4">
        <div className="flex items-center gap-2">
          <input
            type="time"
            name="chef_start"
            value={form.chef_start}
            onChange={onChange}
            className="w-full max-w-32 rounded-md border border-gray-300 px-2 py-1 text-xs sm:text-sm"
          />
          <span className="text-gray-500">-</span>
          <input
            type="time"
            name="chef_end"
            value={form.chef_end}
            onChange={onChange}
            className="w-full max-w-32 rounded-md border border-gray-300 px-2 py-1 text-xs sm:text-sm"
          />
        </div>
      </td>
      <td className="px-2 py-2 text-xs sm:text-sm text-gray-700 sm:px-4">
        <input
          type="number"
          min={0}
          name="required_kitchen_hands"
          value={form.required_kitchen_hands}
          onChange={onChange}
          className="w-full max-w-20 rounded-md border border-gray-300 px-2 py-1 text-xs sm:text-sm"
        />
      </td>
      <td className="hidden px-2 py-2 text-xs sm:table-cell sm:text-sm text-gray-700 sm:px-4">
        <div className="flex items-center gap-2">
          <input
            type="time"
            name="kitchen_start"
            value={form.kitchen_start}
            onChange={onChange}
            className="w-full max-w-32 rounded-md border border-gray-300 px-2 py-1 text-xs sm:text-sm"
          />
          <span className="text-gray-500">-</span>
          <input
            type="time"
            name="kitchen_end"
            value={form.kitchen_end}
            onChange={onChange}
            className="w-full max-w-32 rounded-md border border-gray-300 px-2 py-1 text-xs sm:text-sm"
          />
        </div>
      </td>
      <td className="hidden px-2 py-2 text-xs sm:table-cell sm:text-sm text-gray-700 sm:px-4">
        <input
          type="text"
          name="notes"
          value={form.notes}
          onChange={onChange}
          className="w-full max-w-32 rounded-md border border-gray-300 px-2 py-1 text-xs sm:text-sm"
        />
      </td>
      <td className="px-2 py-2 text-right sm:px-4">
        <div className="flex flex-col gap-1 sm:flex-row sm:justify-end">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setIsEditing(false)}
            disabled={saving}
            className="text-xs"
          >
            Cancel
          </Button>
          <Button
            size="sm"
            onClick={onSave}
            disabled={saving}
            className="text-xs"
          >
            {saving ? "Saving..." : "Save"}
          </Button>
        </div>
      </td>
    </tr>
  );
}
