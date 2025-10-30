"use client";

import React from "react";
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

export default function BusinessRequirementForm() {
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

  const [usedDays, setUsedDays] = React.useState(new Set());

  React.useEffect(() => {
    // Fetch existing to disable already-used days
    fetch("/api/business-requirements")
      .then((r) => r.json())
      .then((res) => {
        if (res?.data) {
          const s = new Set(res.data.map((r) => r.day_of_week));
          setUsedDays(s);
        }
      })
      .catch(() => {});
  }, []);

  const onSubmit = async (data) => {
    try {
      const res = await fetch("/api/business-requirements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const result = await res.json().catch(() => ({}));
      if (res.ok && result?.success) {
        toast.success("Requirement saved");
        form.reset();
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
                        <option key={d} value={d} disabled={usedDays.has(d)}>
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
            {/* Per-chef slots */}
            {(() => {
              const chefCount = Number(form.watch("required_chefs") || 0);
              const slots = form.watch("chef_slots") || [];
              const updateSlot = (index, key, value) => {
                const next = Array.isArray(slots) ? [...slots] : [];
                while (next.length <= index)
                  next.push({ start: null, end: null, end_is_closing: false });
                next[index] = { ...(next[index] || {}), [key]: value };
                if (key === "end_is_closing" && value) next[index].end = null;
                form.setValue("chef_slots", next);
              };
              return (
                <div className="sm:col-span-2 space-y-2">
                  {Array.from({ length: chefCount }).map((_, i) => (
                    <div
                      key={`chef-slot-${i}`}
                      className="flex items-center gap-2"
                    >
                      <span className="text-xs text-gray-600 w-16">
                        Chef {i + 1}
                      </span>
                      <Input
                        type="time"
                        value={slots?.[i]?.start || ""}
                        onChange={(e) => updateSlot(i, "start", e.target.value)}
                        className="w-36"
                      />
                      <span className="text-gray-500">-</span>
                      <Input
                        type="time"
                        value={slots?.[i]?.end || ""}
                        onChange={(e) => updateSlot(i, "end", e.target.value)}
                        className="w-36"
                        disabled={!!slots?.[i]?.end_is_closing}
                      />
                      <label className="flex items-center gap-2 text-xs text-gray-700">
                        <input
                          type="checkbox"
                          checked={!!slots?.[i]?.end_is_closing}
                          onChange={(e) =>
                            updateSlot(i, "end_is_closing", e.target.checked)
                          }
                        />
                        Closing
                      </label>
                    </div>
                  ))}
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
            {/* Per-kitchen slots */}
            {(() => {
              const khCount = Number(form.watch("required_kitchen_hands") || 0);
              const slots = form.watch("kitchen_slots") || [];
              const updateSlot = (index, key, value) => {
                const next = Array.isArray(slots) ? [...slots] : [];
                while (next.length <= index)
                  next.push({ start: null, end: null, end_is_closing: false });
                next[index] = { ...(next[index] || {}), [key]: value };
                if (key === "end_is_closing" && value) next[index].end = null;
                form.setValue("kitchen_slots", next);
              };
              return (
                <div className="sm:col-span-2 space-y-2">
                  {Array.from({ length: khCount }).map((_, i) => (
                    <div
                      key={`kh-slot-${i}`}
                      className="flex items-center gap-2"
                    >
                      <span className="text-xs text-gray-600 w-16">
                        KH {i + 1}
                      </span>
                      <Input
                        type="time"
                        value={slots?.[i]?.start || ""}
                        onChange={(e) => updateSlot(i, "start", e.target.value)}
                        className="w-36"
                      />
                      <span className="text-gray-500">-</span>
                      <Input
                        type="time"
                        value={slots?.[i]?.end || ""}
                        onChange={(e) => updateSlot(i, "end", e.target.value)}
                        className="w-36"
                        disabled={!!slots?.[i]?.end_is_closing}
                      />
                      <label className="flex items-center gap-2 text-xs text-gray-700">
                        <input
                          type="checkbox"
                          checked={!!slots?.[i]?.end_is_closing}
                          onChange={(e) =>
                            updateSlot(i, "end_is_closing", e.target.checked)
                          }
                        />
                        Closing
                      </label>
                    </div>
                  ))}
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
