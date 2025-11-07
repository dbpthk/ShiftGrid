"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { toast } from "sonner";
import {
  addSegment as addSlotSegment,
  ensureSlotsArray,
  removeSegment as removeSlotSegment,
  updateSlotSegments,
  withSegments,
} from "@/lib/slot-utils";

const requirementSchema = z.object({
  day_of_week: z.string().min(3, "Day is required"),
  required_chefs: z.coerce.number().int().min(0),
  required_kitchen_hands: z.coerce.number().int().min(0),
  chef_start: z.string().optional().or(z.literal("")),
  chef_end: z.string().optional().or(z.literal("")),
  chef_end_is_closing: z.boolean().default(false),
  chef_slots: z
    .array(
      z.object({
        start: z.string().nullable().optional(),
        end: z.string().nullable().optional(),
        end_is_closing: z.boolean().optional(),
      })
    )
    .optional(),
  kitchen_start: z.string().optional().or(z.literal("")),
  kitchen_end: z.string().optional().or(z.literal("")),
  kitchen_end_is_closing: z.boolean().default(false),
  kitchen_slots: z
    .array(
      z.object({
        start: z.string().nullable().optional(),
        end: z.string().nullable().optional(),
        end_is_closing: z.boolean().optional(),
      })
    )
    .optional(),
  notes: z.string().optional().or(z.literal("")),
});

export default function BusinessRequirementForm({ usedDays = [] }) {
  const router = useRouter();
  const form = useForm({
    resolver: zodResolver(requirementSchema),
    defaultValues: {
      day_of_week: "",
      required_chefs: 0,
      required_kitchen_hands: 0,
      chef_start: "",
      chef_end: "",
      chef_end_is_closing: false,
      chef_slots: [],
      kitchen_start: "",
      kitchen_end: "",
      kitchen_end_is_closing: false,
      kitchen_slots: [],
      notes: "",
    },
  });

  const [disabledDays, setDisabledDays] = React.useState(new Set(usedDays));
  React.useEffect(() => {
    setDisabledDays(new Set(usedDays));
  }, [usedDays]);

  const onSubmit = async (data) => {
    try {
      const chefCount = Number(data.required_chefs || 0);
      const kitchenCount = Number(data.required_kitchen_hands || 0);

      const chefSlotsRaw = ensureSlotsArray(data.chef_slots);
      while (chefSlotsRaw.length < chefCount) {
        chefSlotsRaw.push(
          withSegments({ segments: [{ start: null, end: null, end_is_closing: false }] })
        );
      }
      const chef_slots = chefSlotsRaw
        .slice(0, chefCount)
        .map((slot) => withSegments(slot));

      const kitchenSlotsRaw = ensureSlotsArray(data.kitchen_slots);
      while (kitchenSlotsRaw.length < kitchenCount) {
        kitchenSlotsRaw.push(
          withSegments({ segments: [{ start: null, end: null, end_is_closing: false }] })
        );
      }
      const kitchen_slots = kitchenSlotsRaw
        .slice(0, kitchenCount)
        .map((slot) => withSegments(slot));

      const res = await fetch("/api/business-requirements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...data,
          chef_slots,
          kitchen_slots,
        }),
      });
      const result = await res.json().catch(() => ({}));
      if (res.ok && result?.success) {
        toast.success("Requirement saved");
        form.reset();
        router.refresh();
      } else {
        toast.error(result?.error || "Failed to save");
      }
    } catch (e) {
      toast.error("Network error");
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-2xl">Add Business Requirement</CardTitle>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="grid gap-4 sm:grid-cols-2"
          >
            <FormField
              control={form.control}
              name="day_of_week"
              render={({ field }) => (
                <FormItem className="sm:col-span-1">
                  <FormLabel>Day of Week</FormLabel>
                  <FormControl>
                    <select
                      {...field}
                      className="block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-gray-500 focus:outline-none"
                    >
                      <option value="" disabled>
                        Select day
                      </option>
                      {[
                        "Monday",
                        "Tuesday",
                        "Wednesday",
                        "Thursday",
                        "Friday",
                        "Saturday",
                        "Sunday",
                      ].map((d) => (
                        <option
                          key={d}
                          value={d}
                          disabled={disabledDays.has(d)}
                        >
                          {d}
                        </option>
                      ))}
                    </select>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="required_chefs"
              render={({ field }) => (
                <FormItem className="sm:col-span-1">
                  <FormLabel>Required Chefs</FormLabel>
                  <FormControl>
                    <Input type="number" min={0} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            {(() => {
              const chefCount = Number(form.watch("required_chefs") || 0);
              const slots = ensureSlotsArray(form.watch("chef_slots") || []);

              const handleSegmentChange = (
                slotIdx,
                segIdx,
                key,
                rawValue
              ) => {
                const nextSlots = updateSlotSegments(
                  form.getValues("chef_slots") || [],
                  slotIdx,
                  segIdx,
                  (segment) => {
                    const value =
                      key === "end_is_closing"
                        ? rawValue
                        : rawValue || null;
                    const updated = {
                      ...segment,
                      [key]: key === "end_is_closing" ? Boolean(value) : value,
                    };
                    if (key === "end_is_closing" && value) {
                      updated.end = null;
                    }
                    return updated;
                  }
                );
                form.setValue("chef_slots", nextSlots, { shouldDirty: true });
              };

              const handleAddSegment = (slotIdx) => {
                const next = addSlotSegment(
                  form.getValues("chef_slots") || [],
                  slotIdx
                );
                form.setValue("chef_slots", next, { shouldDirty: true });
              };

              const handleRemoveSegment = (slotIdx, segIdx) => {
                const next = removeSlotSegment(
                  form.getValues("chef_slots") || [],
                  slotIdx,
                  segIdx
                );
                form.setValue("chef_slots", next, { shouldDirty: true });
              };

              return (
                <div className="sm:col-span-2 space-y-3">
                  {Array.from({ length: chefCount }).map((_, slotIdx) => {
                    const slot = withSegments(
                      slots[slotIdx] || {
                        segments: [
                          { start: null, end: null, end_is_closing: false },
                        ],
                      }
                    );
                    const segments = slot.segments || [];
                    const lastSegment = segments[segments.length - 1];
                    const canAddSegment = !Boolean(lastSegment?.end_is_closing);
                    return (
                      <div
                        key={`chef-slot-${slotIdx}`}
                        className="rounded-md border border-gray-200 p-3 space-y-2"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-semibold text-gray-700 uppercase">
                            Chef {slotIdx + 1}
                          </span>
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
                              <Input
                                type="time"
                                value={segment.start || ""}
                                onChange={(e) =>
                                  handleSegmentChange(
                                    slotIdx,
                                    segIdx,
                                    "start",
                                    e.target.value
                                  )
                                }
                                className="w-24 sm:w-28"
                              />
                              <span className="text-gray-400">-</span>
                              <Input
                                type="time"
                                value={segment.end || ""}
                                onChange={(e) =>
                                  handleSegmentChange(
                                    slotIdx,
                                    segIdx,
                                    "end",
                                    e.target.value
                                  )
                                }
                                disabled={segment.end_is_closing}
                                className="w-24 sm:w-28"
                              />
                              <label className="flex items-center gap-1 text-gray-700 text-[11px] sm:text-xs">
                                <input
                                  type="checkbox"
                                  checked={!!segment.end_is_closing}
                                  onChange={(e) =>
                                    handleSegmentChange(
                                      slotIdx,
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
                                  onClick={() =>
                                    handleRemoveSegment(slotIdx, segIdx)
                                  }
                                  className="text-xs text-red-500 hover:text-red-600"
                                >
                                  Remove part
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
                            onClick={() => handleAddSegment(slotIdx)}
                            className="text-xs"
                          >
                            Add split segment
                          </Button>
                        )}
                      </div>
                    );
                  })}
                </div>
              );
            })()}

            <FormField
              control={form.control}
              name="required_kitchen_hands"
              render={({ field }) => (
                <FormItem className="sm:col-span-1">
                  <FormLabel>Required Kitchen Hands</FormLabel>
                  <FormControl>
                    <Input type="number" min={0} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            {(() => {
              const khCount = Number(form.watch("required_kitchen_hands") || 0);
              const slots = ensureSlotsArray(form.watch("kitchen_slots") || []);

              const handleSegmentChange = (
                slotIdx,
                segIdx,
                key,
                rawValue
              ) => {
                const nextSlots = updateSlotSegments(
                  form.getValues("kitchen_slots") || [],
                  slotIdx,
                  segIdx,
                  (segment) => {
                    const value =
                      key === "end_is_closing"
                        ? rawValue
                        : rawValue || null;
                    const updated = {
                      ...segment,
                      [key]: key === "end_is_closing" ? Boolean(value) : value,
                    };
                    if (key === "end_is_closing" && value) {
                      updated.end = null;
                    }
                    return updated;
                  }
                );
                form.setValue("kitchen_slots", nextSlots, { shouldDirty: true });
              };

              const handleAddSegment = (slotIdx) => {
                const next = addSlotSegment(
                  form.getValues("kitchen_slots") || [],
                  slotIdx
                );
                form.setValue("kitchen_slots", next, { shouldDirty: true });
              };

              const handleRemoveSegment = (slotIdx, segIdx) => {
                const next = removeSlotSegment(
                  form.getValues("kitchen_slots") || [],
                  slotIdx,
                  segIdx
                );
                form.setValue("kitchen_slots", next, { shouldDirty: true });
              };

              return (
                <div className="sm:col-span-2 space-y-3">
                  {Array.from({ length: khCount }).map((_, slotIdx) => {
                    const slot = withSegments(
                      slots[slotIdx] || {
                        segments: [
                          { start: null, end: null, end_is_closing: false },
                        ],
                      }
                    );
                    const segments = slot.segments || [];
                    const lastSegment = segments[segments.length - 1];
                    const canAddSegment = !Boolean(lastSegment?.end_is_closing);
                    return (
                      <div
                        key={`kh-slot-${slotIdx}`}
                        className="rounded-md border border-gray-200 p-3 space-y-2"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-semibold text-gray-700 uppercase">
                            KH {slotIdx + 1}
                          </span>
                        </div>
                        <div className="space-y-2">
                          {segments.map((segment, segIdx) => (
                            <div
                              key={`kh-slot-${slotIdx}-segment-${segIdx}`}
                              className="flex flex-wrap items-center gap-2"
                            >
                              <span className="text-[11px] text-gray-500 w-12">
                                {segments.length > 1 ? `Part ${segIdx + 1}` : ""}
                              </span>
                              <Input
                                type="time"
                                value={segment.start || ""}
                                onChange={(e) =>
                                  handleSegmentChange(
                                    slotIdx,
                                    segIdx,
                                    "start",
                                    e.target.value
                                  )
                                }
                                className="w-24 sm:w-28"
                              />
                              <span className="text-gray-400">-</span>
                              <Input
                                type="time"
                                value={segment.end || ""}
                                onChange={(e) =>
                                  handleSegmentChange(
                                    slotIdx,
                                    segIdx,
                                    "end",
                                    e.target.value
                                  )
                                }
                                disabled={segment.end_is_closing}
                                className="w-24 sm:w-28"
                              />
                              <label className="flex items-center gap-1 text-gray-700 text-[11px] sm:text-xs">
                                <input
                                  type="checkbox"
                                  checked={!!segment.end_is_closing}
                                  onChange={(e) =>
                                    handleSegmentChange(
                                      slotIdx,
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
                                  onClick={() =>
                                    handleRemoveSegment(slotIdx, segIdx)
                                  }
                                  className="text-xs text-red-500 hover:text-red-600"
                                >
                                  Remove part
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
                            onClick={() => handleAddSegment(slotIdx)}
                            className="text-xs"
                          >
                            Add split segment
                          </Button>
                        )}
                      </div>
                    );
                  })}
                </div>
              );
            })()}
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem className="sm:col-span-2">
                  <FormLabel>Notes</FormLabel>
                  <FormControl>
                    <Input placeholder="Optional" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="sm:col-span-2">
              <Button
                type="submit"
                disabled={form.formState.isSubmitting}
                className="w-full sm:w-auto"
              >
                Save Requirement
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
