"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";

export default function EmployeeRow({ row, availabilityDays = [] }) {
  const router = useRouter();
  const [isEditing, setIsEditing] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [form, setForm] = React.useState({
    name: row.name || "",
    role: row.role || "",
    email: row.email || "",
    phone: row.phone || "",
  });
  const [availability, setAvailability] = React.useState(() => {
    const base = {
      Monday: false,
      Tuesday: false,
      Wednesday: false,
      Thursday: false,
      Friday: false,
      Saturday: false,
      Sunday: false,
    };
    for (const d of availabilityDays) base[d] = true;
    return base;
  });

  const onChange = (e) => {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
  };

  const onSave = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/employees", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: row.id, ...form, availability }),
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
        <td
          className="max-w-40 truncate px-2 py-2 text-xs sm:text-sm text-gray-900 sm:px-4"
          title={row.name}
        >
          {row.name}
        </td>
        <td
          className="max-w-32 truncate px-2 py-2 text-xs sm:text-sm text-gray-700 sm:px-4"
          title={row.role}
        >
          {row.role}
        </td>
        <td className="hidden px-2 py-2 text-xs sm:table-cell sm:text-sm text-gray-700 sm:px-4">
          {row.email || "-"}
        </td>
        <td className="hidden px-2 py-2 text-xs sm:table-cell sm:text-sm text-gray-700 sm:px-4">
          {row.phone || "-"}
        </td>
        <td className="px-2 py-2 text-xs sm:text-sm text-gray-700 sm:px-4">
          {availabilityDays.length ? (
            <div className="flex max-w-48 flex-wrap gap-1">
              {availabilityDays.map((d) => (
                <span
                  key={d}
                  className="inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-[10px] sm:text-xs text-gray-700"
                >
                  {d.slice(0, 3)}
                </span>
              ))}
            </div>
          ) : (
            "-"
          )}
        </td>
        <td className="hidden px-2 py-2 text-xs sm:table-cell sm:text-sm text-gray-500 sm:px-4">
          {new Date(row.created_at).toLocaleString()}
        </td>
        <td className="px-10 py-2 text-right sm:px-4">
          <Button size="sm" onClick={() => setIsEditing(true)}>
            Edit
          </Button>
        </td>
      </tr>
    );
  }

  return (
    <tr>
      <td className="px-2 py-2 text-xs sm:text-sm text-gray-900 sm:px-4">
        <input
          name="name"
          value={form.name}
          onChange={onChange}
          className="w-full max-w-48 rounded-md border border-gray-300 px-2 py-1 text-xs sm:text-sm"
        />
      </td>
      <td className="px-2 py-2 text-xs sm:text-sm text-gray-700 sm:px-4">
        <input
          name="role"
          value={form.role}
          onChange={onChange}
          className="w-full max-w-40 rounded-md border border-gray-300 px-2 py-1 text-xs sm:text-sm"
        />
      </td>
      <td className="hidden px-2 py-2 text-xs sm:table-cell sm:text-sm text-gray-700 sm:px-4">
        <input
          name="email"
          value={form.email}
          onChange={onChange}
          className="w-full max-w-56 rounded-md border border-gray-300 px-2 py-1 text-xs sm:text-sm"
        />
      </td>
      <td className="hidden px-2 py-2 text-xs sm:table-cell sm:text-sm text-gray-700 sm:px-4">
        <input
          name="phone"
          value={form.phone}
          onChange={onChange}
          className="w-full max-w-48 rounded-md border border-gray-300 px-2 py-1 text-xs sm:text-sm"
        />
      </td>
      <td className="px-2 py-2 text-xs sm:text-sm text-gray-700 sm:px-4">
        <div className="space-y-2">
          <div className="text-xs font-medium text-gray-600 mb-2">
            Availability
          </div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
            {[
              "Monday",
              "Tuesday",
              "Wednesday",
              "Thursday",
              "Friday",
              "Saturday",
              "Sunday",
            ].map((day) => (
              <label
                key={day}
                className="flex items-center gap-2 p-2 rounded-md hover:bg-gray-50 transition-colors"
              >
                <input
                  type="checkbox"
                  checked={availability[day]}
                  onChange={(e) =>
                    setAvailability((prev) => ({
                      ...prev,
                      [day]: e.target.checked,
                    }))
                  }
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-xs font-medium text-gray-700">
                  {day.slice(0, 3)}
                </span>
              </label>
            ))}
          </div>
        </div>
      </td>
      <td className="hidden px-2 py-2 text-xs sm:table-cell sm:text-sm text-gray-500 sm:px-4">
        {new Date(row.created_at).toLocaleString()}
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
