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
  kitchen_start: z.string().optional().or(z.literal("")),
  kitchen_end: z.string().optional().or(z.literal("")),
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
      kitchen_start: "",
      kitchen_end: "",
      notes: "",
    },
  });

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
                      <option value="Monday">Monday</option>
                      <option value="Tuesday">Tuesday</option>
                      <option value="Wednesday">Wednesday</option>
                      <option value="Thursday">Thursday</option>
                      <option value="Friday">Friday</option>
                      <option value="Saturday">Saturday</option>
                      <option value="Sunday">Sunday</option>
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
            <FormField
              control={form.control}
              name="chef_start"
              render={({ field }) => (
                <FormItem className="sm:col-span-1">
                  <FormLabel>Chef Start Time</FormLabel>
                  <FormControl>
                    <Input type="time" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="chef_end"
              render={({ field }) => (
                <FormItem className="sm:col-span-1">
                  <FormLabel>Chef End Time</FormLabel>
                  <FormControl>
                    <Input type="time" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
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
            <FormField
              control={form.control}
              name="kitchen_start"
              render={({ field }) => (
                <FormItem className="sm:col-span-1">
                  <FormLabel>Kitchen Hand Start Time</FormLabel>
                  <FormControl>
                    <Input type="time" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="kitchen_end"
              render={({ field }) => (
                <FormItem className="sm:col-span-1">
                  <FormLabel>Kitchen Hand End Time</FormLabel>
                  <FormControl>
                    <Input type="time" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
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
