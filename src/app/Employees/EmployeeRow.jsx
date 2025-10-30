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
          {row.name}
        </td>
        <td className="whitespace-nowrap px-4 py-2 text-sm text-gray-700">
          {row.role}
        </td>
        <td className="whitespace-nowrap px-4 py-2 text-sm text-gray-700">
          {row.email || "-"}
        </td>
        <td className="whitespace-nowrap px-4 py-2 text-sm text-gray-700">
          {row.phone || "-"}
        </td>
        <td className="whitespace-nowrap px-4 py-2 text-sm text-gray-700">
          {availabilityDays.length
            ? availabilityDays.map((d) => d.slice(0, 3)).join(", ")
            : "-"}
        </td>
        <td className="whitespace-nowrap px-4 py-2 text-sm text-gray-500">
          {new Date(row.created_at).toLocaleString()}
        </td>
        <td className="whitespace-nowrap px-4 py-2 text-right">
          <Button size="sm" onClick={() => setIsEditing(true)}>
            Edit
          </Button>
        </td>
      </tr>
    );
  }

  return (
    <tr>
      <td className="whitespace-nowrap px-4 py-2 text-sm text-gray-900">
        <input
          name="name"
          value={form.name}
          onChange={onChange}
          className="w-40 rounded-md border border-gray-300 px-2 py-1 text-sm"
        />
      </td>
      <td className="whitespace-nowrap px-4 py-2 text-sm text-gray-700">
        <input
          name="role"
          value={form.role}
          onChange={onChange}
          className="w-36 rounded-md border border-gray-300 px-2 py-1 text-sm"
        />
      </td>
      <td className="whitespace-nowrap px-4 py-2 text-sm text-gray-700">
        <input
          name="email"
          value={form.email}
          onChange={onChange}
          className="w-56 rounded-md border border-gray-300 px-2 py-1 text-sm"
        />
      </td>
      <td className="whitespace-nowrap px-4 py-2 text-sm text-gray-700">
        <input
          name="phone"
          value={form.phone}
          onChange={onChange}
          className="w-40 rounded-md border border-gray-300 px-2 py-1 text-sm"
        />
      </td>
      <td className="whitespace-nowrap px-4 py-2 text-sm text-gray-500">
        {new Date(row.created_at).toLocaleString()}
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
