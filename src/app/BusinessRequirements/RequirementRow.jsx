"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  addSegment as addSlotSegment,
  ensureSlotsArray,
  formatSegmentsForDisplay,
  removeSegment as removeSlotSegment,
  updateSlotSegments,
  withSegments,
} from "@/lib/slot-utils";

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
  const normalizeRow = React.useCallback(
    (value) => ({
      ...value,
      chef_slots: ensureSlotsArray(value?.chef_slots || []),
      kitchen_slots: ensureSlotsArray(value?.kitchen_slots || []),
    }),
    []
  );
  const [isEditing, setIsEditing] = React.useState(false);
  const [rowData, setRowData] = React.useState(() => normalizeRow(row));
  const [liveUsedDays, setLiveUsedDays] = React.useState(usedDays);
  const [form, setForm] = React.useState(() => {
    const normalized = normalizeRow(row);
    return {
      day_of_week: normalized.day_of_week || "",
      required_chefs: normalized.required_chefs ?? 0,
      required_kitchen_hands: normalized.required_kitchen_hands ?? 0,
      chef_start: row.chef_start || "",
      chef_end: row.chef_end || "",
      chef_end_is_closing: row.chef_end_is_closing || false,
      kitchen_start: row.kitchen_start || "",
      kitchen_end: row.kitchen_end || "",
      kitchen_end_is_closing: row.kitchen_end_is_closing || false,
      notes: normalized.notes || "",
      chef_slots: normalized.chef_slots,
      kitchen_slots: normalized.kitchen_slots,
    };
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
      const chefCount = Number(form.required_chefs || 0);
      const kitchenCount = Number(form.required_kitchen_hands || 0);
      const chefSlotsRaw = ensureSlotsArray(form.chef_slots || []);
      while (chefSlotsRaw.length < chefCount) {
        chefSlotsRaw.push(
          withSegments({
            segments: [{ start: form.chef_start || null, end: form.chef_end || null, end_is_closing: !!form.chef_end_is_closing }],
          })
        );
      }
      const kitchenSlotsRaw = ensureSlotsArray(form.kitchen_slots || []);
      while (kitchenSlotsRaw.length < kitchenCount) {
        kitchenSlotsRaw.push(
          withSegments({
            segments: [
              {
                start: form.kitchen_start || null,
                end: form.kitchen_end || null,
                end_is_closing: !!form.kitchen_end_is_closing,
              },
            ],
          })
        );
      }

      const chef_slots = chefSlotsRaw.slice(0, chefCount).map((slot) => withSegments(slot));
      const kitchen_slots = kitchenSlotsRaw
        .slice(0, kitchenCount)
        .map((slot) => withSegments(slot));

      const res = await fetch("/api/business-requirements", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: row.id,
          day_of_week: form.day_of_week,
          required_chefs: chefCount,
          required_kitchen_hands: kitchenCount,
          chef_start: form.chef_start,
          chef_end: form.chef_end,
          chef_end_is_closing: form.chef_end_is_closing,
          kitchen_start: form.kitchen_start,
          kitchen_end: form.kitchen_end,
          kitchen_end_is_closing: form.kitchen_end_is_closing,
          notes: form.notes,
          chef_slots,
          kitchen_slots,
        }),
      });
      const result = await res.json().catch(() => ({}));
      if (res.ok && result?.success) {
        const updated = Array.isArray(result.data)
          ? result.data[0]
          : result.data;
        if (updated) {
          const normalizedUpdated = normalizeRow(updated);
          setRowData(normalizedUpdated);
          setForm((prev) => ({
            ...prev,
            day_of_week: normalizedUpdated.day_of_week || prev.day_of_week,
            required_chefs: normalizedUpdated.required_chefs ?? prev.required_chefs,
            required_kitchen_hands:
              normalizedUpdated.required_kitchen_hands ??
              prev.required_kitchen_hands,
            chef_start: normalizedUpdated.chef_start || prev.chef_start,
            chef_end: normalizedUpdated.chef_end || prev.chef_end,
            chef_end_is_closing:
              normalizedUpdated.chef_end_is_closing ?? prev.chef_end_is_closing,
            kitchen_start: normalizedUpdated.kitchen_start || prev.kitchen_start,
            kitchen_end: normalizedUpdated.kitchen_end || prev.kitchen_end,
            kitchen_end_is_closing:
              normalizedUpdated.kitchen_end_is_closing ??
              prev.kitchen_end_is_closing,
            notes: normalizedUpdated.notes || "",
            chef_slots: normalizedUpdated.chef_slots,
            kitchen_slots: normalizedUpdated.kitchen_slots,
          }));
        }
        toast.success("Requirement updated");
        router.refresh();
        setIsEditing(false);
      } else {
        toast.error(result?.error || "Failed to update");
      }
    } catch (e) {
      toast.error("Network error");
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
                      C{i + 1}: {formatSegmentsForDisplay(s)}
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
                      KH{i + 1}: {formatSegmentsForDisplay(s)}
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
            {(() => {
              const chefSlots = ensureSlotsArray(form.chef_slots || []);
              return Array.from({ length: Number(form.required_chefs || 0) }).map(
                (_, slotIdx) => {
                const slot = withSegments(
                  chefSlots[slotIdx] || {
                    segments: [
                      { start: null, end: null, end_is_closing: false },
                    ],
                  }
                );
                const segments = slot.segments || [];
                const lastSegment = segments[segments.length - 1];
                const canAddSegment = !Boolean(lastSegment?.end_is_closing);

                const handleSegmentChange = (segIdx, key, rawValue) => {
                  setForm((prev) => ({
                    ...prev,
                    chef_slots: updateSlotSegments(
                      prev.chef_slots || [],
                      slotIdx,
                      segIdx,
                      (segment) => {
                        const value =
                          key === "end_is_closing"
                            ? rawValue
                            : rawValue || null;
                        const updated = {
                          ...segment,
                          [key]:
                            key === "end_is_closing"
                              ? Boolean(value)
                              : value,
                        };
                        if (key === "end_is_closing" && value) {
                          updated.end = null;
                        }
                        return updated;
                      }
                    ),
                  }));
                };

                const handleAddSegment = () => {
                  setForm((prev) => ({
                    ...prev,
                    chef_slots: addSlotSegment(prev.chef_slots || [], slotIdx),
                  }));
                };

                const handleRemoveSegment = (segIdx) => {
                  setForm((prev) => ({
                    ...prev,
                    chef_slots: removeSlotSegment(
                      prev.chef_slots || [],
                      slotIdx,
                      segIdx
                    ),
                  }));
                };

                return (
                  <div
                    key={`chef-slot-${slotIdx}`}
                    className="w-full rounded-md border border-gray-200 px-2 py-2 sm:w-auto"
                  >
                    <div className="mb-2 text-[11px] font-semibold text-gray-600">
                      Chef {slotIdx + 1}
                    </div>
                    <div className="space-y-2">
                      {segments.map((segment, segIdx) => (
                        <div
                          key={`chef-slot-${slotIdx}-segment-${segIdx}`}
                          className="flex flex-wrap items-center gap-2"
                        >
                          <span className="text-[11px] text-gray-500 w-12">
                            {segments.length > 1 ? `Part ${segIdx + 1}` : ""}
                          </span>
                          <input
                            type="time"
                            value={segment.start || ""}
                            onChange={(e) =>
                              handleSegmentChange(segIdx, "start", e.target.value)
                            }
                            className="w-24 sm:w-28 rounded-md border border-gray-300 px-2 py-1 text-xs sm:text-sm"
                          />
                          <span className="text-gray-400">-</span>
                          <input
                            type="time"
                            value={segment.end || ""}
                            onChange={(e) =>
                              handleSegmentChange(segIdx, "end", e.target.value)
                            }
                            disabled={segment.end_is_closing}
                            className="w-24 sm:w-28 rounded-md border border-gray-300 px-2 py-1 text-xs sm:text-sm"
                          />
                          <label className="flex items-center gap-1 text-gray-700 text-[11px] sm:text-xs">
                            <input
                              type="checkbox"
                              checked={!!segment.end_is_closing}
                              onChange={(e) =>
                                handleSegmentChange(
                                  segIdx,
                                  "end_is_closing",
                                  e.target.checked
                                )
                              }
                            />
                            Closing
                          </label>
                          {segments.length > 1 && (
                            <Button
                              type="button"
                              size="sm"
                              variant="ghost"
                              onClick={() => handleRemoveSegment(segIdx)}
                              className="text-xs text-red-500 hover:text-red-600"
                            >
                              Remove
                            </Button>
                          )}
                        </div>
                      ))}
                    </div>
                    {canAddSegment && (
                      <Button
                        type="button"
                        size="sm"
                        variant="secondary"
                        onClick={handleAddSegment}
                        className="mt-2 text-xs"
                      >
                        Add split segment
                      </Button>
                    )}
                  </div>
                );
                }
              );
            })()}
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
            {(() => {
              const kitchenSlots = ensureSlotsArray(form.kitchen_slots || []);
              return Array.from({
                length: Number(form.required_kitchen_hands || 0),
              }).map((_, slotIdx) => {
              const slot = withSegments(
                kitchenSlots[slotIdx] || {
                  segments: [
                    { start: null, end: null, end_is_closing: false },
                  ],
                }
              );
              const segments = slot.segments || [];
              const lastSegment = segments[segments.length - 1];
              const canAddSegment = !Boolean(lastSegment?.end_is_closing);

              const handleSegmentChange = (segIdx, key, rawValue) => {
                setForm((prev) => ({
                  ...prev,
                  kitchen_slots: updateSlotSegments(
                    prev.kitchen_slots || [],
                    slotIdx,
                    segIdx,
                    (segment) => {
                      const value =
                        key === "end_is_closing"
                          ? rawValue
                          : rawValue || null;
                      const updated = {
                        ...segment,
                        [key]:
                          key === "end_is_closing" ? Boolean(value) : value,
                      };
                      if (key === "end_is_closing" && value) {
                        updated.end = null;
                      }
                      return updated;
                    }
                  ),
                }));
              };

              const handleAddSegment = () => {
                setForm((prev) => ({
                  ...prev,
                  kitchen_slots: addSlotSegment(
                    prev.kitchen_slots || [],
                    slotIdx
                  ),
                }));
              };

              const handleRemoveSegment = (segIdx) => {
                setForm((prev) => ({
                  ...prev,
                  kitchen_slots: removeSlotSegment(
                    prev.kitchen_slots || [],
                    slotIdx,
                    segIdx
                  ),
                }));
              };

                return (
                <div
                  key={`kitchen-slot-${slotIdx}`}
                  className="w-full rounded-md border border-gray-200 px-2 py-2 sm:w-auto"
                >
                  <div className="mb-2 text-[11px] font-semibold text-gray-600">
                    KH {slotIdx + 1}
                  </div>
                  <div className="space-y-2">
                    {segments.map((segment, segIdx) => (
                      <div
                        key={`kitchen-slot-${slotIdx}-segment-${segIdx}`}
                        className="flex flex-wrap items-center gap-2"
                      >
                        <span className="text-[11px] text-gray-500 w-12">
                          {segments.length > 1 ? `Part ${segIdx + 1}` : ""}
                        </span>
                        <input
                          type="time"
                          value={segment.start || ""}
                          onChange={(e) =>
                            handleSegmentChange(segIdx, "start", e.target.value)
                          }
                          className="w-24 sm:w-28 rounded-md border border-gray-300 px-2 py-1 text-xs sm:text-sm"
                        />
                        <span className="text-gray-400">-</span>
                        <input
                          type="time"
                          value={segment.end || ""}
                          onChange={(e) =>
                            handleSegmentChange(segIdx, "end", e.target.value)
                          }
                          disabled={segment.end_is_closing}
                          className="w-24 sm:w-28 rounded-md border border-gray-300 px-2 py-1 text-xs sm:text-sm"
                        />
                        <label className="flex items-center gap-1 text-gray-700 text-[11px] sm:text-xs">
                          <input
                            type="checkbox"
                            checked={!!segment.end_is_closing}
                            onChange={(e) =>
                              handleSegmentChange(
                                segIdx,
                                "end_is_closing",
                                e.target.checked
                              )
                            }
                          />
                          Closing
                        </label>
                        {segments.length > 1 && (
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            onClick={() => handleRemoveSegment(segIdx)}
                            className="text-xs text-red-500 hover:text-red-600"
                          >
                            Remove
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                  {canAddSegment && (
                    <Button
                      type="button"
                      size="sm"
                      variant="secondary"
                      onClick={handleAddSegment}
                      className="mt-2 text-xs"
                    >
                      Add split segment
                    </Button>
                  )}
                </div>
                );
              });
            })()}
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
