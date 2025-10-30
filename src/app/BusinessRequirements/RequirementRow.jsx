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

export default function RequirementRow({ row, usedDays = [] }) {
  const router = useRouter();
  const [isEditing, setIsEditing] = React.useState(false);
  const [rowData, setRowData] = React.useState(row);
  const [liveUsedDays, setLiveUsedDays] = React.useState(usedDays);
  const [form, setForm] = React.useState({
    day_of_week: row.day_of_week || "",
    required_chefs: row.required_chefs ?? 0,
    required_kitchen_hands: row.required_kitchen_hands ?? 0,
    chef_start: row.chef_start || "",
    chef_end: row.chef_end || "",
    chef_end_is_closing: row.chef_end_is_closing || false,
    kitchen_start: row.kitchen_start || "",
    kitchen_end: row.kitchen_end || "",
    kitchen_end_is_closing: row.kitchen_end_is_closing || false,
    notes: row.notes || "",
    chef_slots: Array.isArray(row.chef_slots) ? row.chef_slots : [],
    kitchen_slots: Array.isArray(row.kitchen_slots) ? row.kitchen_slots : [],
  });
  const [saving, setSaving] = React.useState(false);
  const [deleting, setDeleting] = React.useState(false);

  const onChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((f) => ({
      ...f,
      [name]: name.includes("required_")
        ? Number(value)
        : type === "checkbox"
        ? checked
        : value,
    }));
  };

  const onSave = async () => {
    setSaving(true);
    try {
      // Ensure slots arrays match required counts
      const chefCount = Number(form.required_chefs || 0);
      const kitchenCount = Number(form.required_kitchen_hands || 0);
      const chef_slots = (form.chef_slots || []).slice(0, chefCount);
      while (chef_slots.length < chefCount) {
        chef_slots.push({
          start: form.chef_start || null,
          end: form.chef_end_is_closing ? null : form.chef_end || null,
          end_is_closing: !!form.chef_end_is_closing,
        });
      }
      const kitchen_slots = (form.kitchen_slots || []).slice(0, kitchenCount);
      while (kitchen_slots.length < kitchenCount) {
        kitchen_slots.push({
          start: form.kitchen_start || null,
          end: form.kitchen_end_is_closing ? null : form.kitchen_end || null,
          end_is_closing: !!form.kitchen_end_is_closing,
        });
      }
      const res = await fetch("/api/business-requirements", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: row.id,
          ...form,
          chef_slots,
          kitchen_slots,
        }),
      });
      const result = await res.json().catch(() => ({}));
      if (res.ok && result?.success) {
        const updated = Array.isArray(result.data)
          ? result.data[0]
          : result.data;
        if (updated) setRowData(updated);
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

  // Refresh used days when entering edit mode so options reflect latest changes
  React.useEffect(() => {
    if (!isEditing) return;
    fetch("/api/business-requirements")
      .then((r) => r.json())
      .then((res) => {
        if (Array.isArray(res?.data)) {
          setLiveUsedDays(res.data.map((r) => r.day_of_week));
        }
      })
      .catch(() => {});
  }, [isEditing]);

  const onDelete = async () => {
    if (!confirm("Delete this requirement?")) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/business-requirements?id=${row.id}`, {
        method: "DELETE",
      });
      const result = await res.json().catch(() => ({}));
      if (res.ok && result?.success) {
        router.refresh();
      } else {
        alert(result?.error || "Failed to delete");
      }
    } catch (e) {
      alert("Network error");
    } finally {
      setDeleting(false);
    }
  };

  if (!isEditing) {
    return (
      <tr>
        <td className="px-2 py-2 text-xs sm:text-sm text-gray-900 sm:px-4">
          {rowData.day_of_week}
        </td>
        <td className="px-2 py-2 text-xs sm:text-sm text-gray-700 sm:px-4">
          <div className="space-y-1">
            <div className="text-[11px] text-gray-600">
              Required: {rowData.required_chefs}
            </div>
            {Array.isArray(rowData.chef_slots) &&
              rowData.chef_slots.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {rowData.chef_slots.map((s, i) => (
                    <span
                      key={`chef-slot-${i}`}
                      className="rounded bg-gray-100 px-2 py-0.5 text-[10px] text-gray-700"
                      title={`Chef ${i + 1}`}
                    >
                      C{i + 1}: {s?.start ? String(s.start).slice(0, 5) : "--"}{" "}
                      -{" "}
                      {s?.end_is_closing
                        ? "closing"
                        : s?.end
                        ? String(s.end).slice(0, 5)
                        : "--"}
                    </span>
                  ))}
                </div>
              )}
          </div>
        </td>
        <td className="px-2 py-2 text-xs sm:text-sm text-gray-700 sm:px-4">
          <div className="space-y-1">
            <div className="text-[11px] text-gray-600">
              Required: {rowData.required_kitchen_hands}
            </div>
            {Array.isArray(rowData.kitchen_slots) &&
              rowData.kitchen_slots.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {rowData.kitchen_slots.map((s, i) => (
                    <span
                      key={`kh-slot-${i}`}
                      className="rounded bg-gray-100 px-2 py-0.5 text-[10px] text-gray-700"
                      title={`Kitchen Hand ${i + 1}`}
                    >
                      KH{i + 1}: {s?.start ? String(s.start).slice(0, 5) : "--"}{" "}
                      -{" "}
                      {s?.end_is_closing
                        ? "closing"
                        : s?.end
                        ? String(s.end).slice(0, 5)
                        : "--"}
                    </span>
                  ))}
                </div>
              )}
          </div>
        </td>
        <td className="hidden px-2 py-2 text-xs sm:table-cell sm:text-sm text-gray-700 sm:px-4">
          {rowData.notes || "-"}
        </td>
        <td className="px-2 py-2 text-right sm:px-4">
          <div className="flex items-center justify-end gap-2">
            <Button onClick={() => setIsEditing(true)} size="sm">
              Edit
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={onDelete}
              disabled={deleting}
            >
              {deleting ? "Deleting..." : "Delete"}
            </Button>
          </div>
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
            <option
              key={d}
              value={d}
              disabled={liveUsedDays.includes(d) && d !== form.day_of_week}
            >
              {d}
            </option>
          ))}
        </select>
      </td>
      <td className="px-2 py-2 text-xs sm:text-sm text-gray-700 sm:px-4 align-top">
        <div className="space-y-2">
          <input
            type="number"
            min={0}
            name="required_chefs"
            value={form.required_chefs}
            onChange={onChange}
            className="w-full max-w-24 sm:max-w-20 rounded-md border border-gray-300 px-2 py-1 text-xs sm:text-sm"
          />
          {/* Per-chef slot times */}
          <div className="flex flex-wrap gap-2 max-w-full overflow-x-auto">
            {Array.from({ length: Number(form.required_chefs || 0) }).map(
              (_, i) => (
                <div
                  key={`chef-slot-${i}`}
                  className="w-full sm:w-auto flex items-center gap-2 border border-gray-200 rounded-md px-2 py-1"
                >
                  <span className="text-[11px] text-gray-600 w-12 shrink-0">
                    Chef {i + 1}
                  </span>
                  <input
                    type="time"
                    value={form.chef_slots?.[i]?.start || ""}
                    onChange={(e) =>
                      setForm((f) => {
                        const next = Array.isArray(f.chef_slots)
                          ? [...f.chef_slots]
                          : [];
                        while (next.length <= i)
                          next.push({
                            start: null,
                            end: null,
                            end_is_closing: false,
                          });
                        next[i] = { ...(next[i] || {}), start: e.target.value };
                        return { ...f, chef_slots: next };
                      })
                    }
                    className="w-24 sm:w-28 rounded-md border border-gray-300 px-2 py-1 text-xs sm:text-sm"
                  />
                  <span className="text-gray-400">-</span>
                  <input
                    type="time"
                    value={form.chef_slots?.[i]?.end || ""}
                    onChange={(e) =>
                      setForm((f) => {
                        const next = Array.isArray(f.chef_slots)
                          ? [...f.chef_slots]
                          : [];
                        while (next.length <= i)
                          next.push({
                            start: null,
                            end: null,
                            end_is_closing: false,
                          });
                        next[i] = { ...(next[i] || {}), end: e.target.value };
                        return { ...f, chef_slots: next };
                      })
                    }
                    disabled={form.chef_slots?.[i]?.end_is_closing}
                    className="w-24 sm:w-28 rounded-md border border-gray-300 px-2 py-1 text-xs sm:text-sm"
                  />
                  <label className="flex items-center gap-1 text-gray-700 text-[11px] sm:text-xs">
                    <input
                      type="checkbox"
                      checked={!!form.chef_slots?.[i]?.end_is_closing}
                      onChange={(e) =>
                        setForm((f) => {
                          const next = Array.isArray(f.chef_slots)
                            ? [...f.chef_slots]
                            : [];
                          while (next.length <= i)
                            next.push({
                              start: null,
                              end: null,
                              end_is_closing: false,
                            });
                          next[i] = {
                            ...(next[i] || {}),
                            end_is_closing: e.target.checked,
                          };
                          if (e.target.checked) next[i].end = null;
                          return { ...f, chef_slots: next };
                        })
                      }
                    />
                    Closing
                  </label>
                </div>
              )
            )}
          </div>
        </div>
      </td>
      <td className="px-2 py-2 text-xs sm:text-sm text-gray-700 sm:px-4 align-top">
        <div className="space-y-2">
          <input
            type="number"
            min={0}
            name="required_kitchen_hands"
            value={form.required_kitchen_hands}
            onChange={onChange}
            className="w-full max-w-24 sm:max-w-20 rounded-md border border-gray-300 px-2 py-1 text-xs sm:text-sm"
          />
          {/* Per-kitchen slot times */}
          <div className="flex flex-wrap gap-2 max-w-full overflow-x-auto">
            {Array.from({
              length: Number(form.required_kitchen_hands || 0),
            }).map((_, i) => (
              <div
                key={`kitchen-slot-${i}`}
                className="w-full sm:w-auto flex items-center gap-2 border border-gray-200 rounded-md px-2 py-1"
              >
                <span className="text-[11px] text-gray-600 w-10 shrink-0">
                  KH {i + 1}
                </span>
                <input
                  type="time"
                  value={form.kitchen_slots?.[i]?.start || ""}
                  onChange={(e) =>
                    setForm((f) => {
                      const next = Array.isArray(f.kitchen_slots)
                        ? [...f.kitchen_slots]
                        : [];
                      while (next.length <= i)
                        next.push({
                          start: null,
                          end: null,
                          end_is_closing: false,
                        });
                      next[i] = { ...(next[i] || {}), start: e.target.value };
                      return { ...f, kitchen_slots: next };
                    })
                  }
                  className="w-24 sm:w-28 rounded-md border border-gray-300 px-2 py-1 text-xs sm:text-sm"
                />
                <span className="text-gray-400">-</span>
                <input
                  type="time"
                  value={form.kitchen_slots?.[i]?.end || ""}
                  onChange={(e) =>
                    setForm((f) => {
                      const next = Array.isArray(f.kitchen_slots)
                        ? [...f.kitchen_slots]
                        : [];
                      while (next.length <= i)
                        next.push({
                          start: null,
                          end: null,
                          end_is_closing: false,
                        });
                      next[i] = { ...(next[i] || {}), end: e.target.value };
                      return { ...f, kitchen_slots: next };
                    })
                  }
                  disabled={!!form.kitchen_slots?.[i]?.end_is_closing}
                  className="w-24 sm:w-28 rounded-md border border-gray-300 px-2 py-1 text-xs sm:text-sm"
                />
                <label className="flex items-center gap-1 text-gray-700 text-[11px] sm:text-xs">
                  <input
                    type="checkbox"
                    checked={!!form.kitchen_slots?.[i]?.end_is_closing}
                    onChange={(e) =>
                      setForm((f) => {
                        const next = Array.isArray(f.kitchen_slots)
                          ? [...f.kitchen_slots]
                          : [];
                        while (next.length <= i)
                          next.push({
                            start: null,
                            end: null,
                            end_is_closing: false,
                          });
                        next[i] = {
                          ...(next[i] || {}),
                          end_is_closing: e.target.checked,
                        };
                        if (e.target.checked) next[i].end = null;
                        return { ...f, kitchen_slots: next };
                      })
                    }
                  />
                  Closing
                </label>
              </div>
            ))}
          </div>
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
          <Button
            variant="destructive"
            size="sm"
            onClick={onDelete}
            disabled={deleting}
            className="text-xs"
          >
            {deleting ? "Deleting..." : "Delete"}
          </Button>
        </div>
      </td>
    </tr>
  );
}
