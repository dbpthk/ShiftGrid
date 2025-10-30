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
        <td className="whitespace-nowrap px-4 py-2 text-sm text-gray-900">
          {row.day_of_week}
        </td>
        <td className="whitespace-nowrap px-4 py-2 text-sm text-gray-700">
          {row.required_chefs}
        </td>
        <td className="whitespace-nowrap px-4 py-2 text-sm text-gray-700">
          {row.required_kitchen_hands}
        </td>
        <td className="whitespace-nowrap px-4 py-2 text-sm text-gray-700">
          {row.notes || "-"}
        </td>
        <td className="whitespace-nowrap px-4 py-2 text-right">
          <Button onClick={() => setIsEditing(true)} size="sm">
            Edit
          </Button>
        </td>
      </tr>
    );
  }

  return (
    <tr>
      <td className="whitespace-nowrap px-4 py-2 text-sm text-gray-900">
        <select
          name="day_of_week"
          value={form.day_of_week}
          onChange={onChange}
          className="rounded-md border border-gray-300 bg-white px-2 py-1 text-sm"
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
      <td className="whitespace-nowrap px-4 py-2 text-sm text-gray-700">
        <input
          type="number"
          min={0}
          name="required_chefs"
          value={form.required_chefs}
          onChange={onChange}
          className="w-24 rounded-md border border-gray-300 px-2 py-1 text-sm"
        />
      </td>
      <td className="whitespace-nowrap px-4 py-2 text-sm text-gray-700">
        <input
          type="number"
          min={0}
          name="required_kitchen_hands"
          value={form.required_kitchen_hands}
          onChange={onChange}
          className="w-24 rounded-md border border-gray-300 px-2 py-1 text-sm"
        />
      </td>
      <td className="whitespace-nowrap px-4 py-2 text-sm text-gray-700">
        <input
          type="text"
          name="notes"
          value={form.notes}
          onChange={onChange}
          className="w-56 rounded-md border border-gray-300 px-2 py-1 text-sm"
        />
      </td>
      <td className="whitespace-nowrap px-4 py-2 text-right">
        <div className="flex justify-end gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setIsEditing(false)}
            disabled={saving}
          >
            Cancel
          </Button>
          <Button size="sm" onClick={onSave} disabled={saving}>
            {saving ? "Saving..." : "Save"}
          </Button>
        </div>
      </td>
    </tr>
  );
}
