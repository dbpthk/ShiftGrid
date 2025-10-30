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

// Zod validation
const employeeSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters."),
  role: z.string().min(2, "Role is required."),
  email: z.string().email("Invalid email address").optional().or(z.literal("")),
  phone: z
    .string()
    .min(8, "Phone number too short")
    .max(15, "Phone number too long")
    .optional()
    .or(z.literal("")),
  availability: z
    .object({
      Monday: z.boolean().default(false),
      Tuesday: z.boolean().default(false),
      Wednesday: z.boolean().default(false),
      Thursday: z.boolean().default(false),
      Friday: z.boolean().default(false),
      Saturday: z.boolean().default(false),
      Sunday: z.boolean().default(false),
    })
    .optional(),
});

export default function EmployeeForm() {
  const form = useForm({
    resolver: zodResolver(employeeSchema),
    defaultValues: {
      name: "",
      role: "",
      email: "",
      phone: "",
      availability: {
        Monday: false,
        Tuesday: false,
        Wednesday: false,
        Thursday: false,
        Friday: false,
        Saturday: false,
        Sunday: false,
      },
    },
  });

  const onSubmit = async (data) => {
    try {
      const response = await fetch("/api/employees", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      let result = {};
      try {
        result = await response.json();
      } catch (e) {
        result = {};
      }

      if (response.ok && result.success) {
        toast.success("Employee added successfully!");
        form.reset();
      } else {
        toast.error(result?.error || "Failed to add employee.");
      }
    } catch (error) {
      console.error(error);
      toast.error("An error occurred. Please try again.");
    }
  };

  return (
    <div className="flex justify-center items-center min-h-screen bg-gray-50 p-6">
      <Card className="w-full max-w-lg shadow-xl border border-gray-200 rounded-xl">
        <CardHeader>
          <CardTitle className="text-3xl font-semibold text-center text-gray-800">
            Add New Employee
          </CardTitle>
        </CardHeader>

        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-gray-700 font-medium">
                      Full Name
                    </FormLabel>
                    <FormControl>
                      <Input
                        placeholder="e.g., John Doe"
                        {...field}
                        className="bg-gray-50 border-gray-300 text-gray-800 placeholder-gray-400 focus:border-gray-500 focus:ring-gray-200"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="role"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-gray-700 font-medium">
                      Role
                    </FormLabel>
                    <FormControl>
                      <Input
                        placeholder="e.g., Head Chef"
                        {...field}
                        className="bg-gray-50 border-gray-300 text-gray-800 placeholder-gray-400 focus:border-gray-500 focus:ring-gray-200"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-gray-700 font-medium">
                      Email
                    </FormLabel>
                    <FormControl>
                      <Input
                        placeholder="e.g., john@kitchen.com"
                        {...field}
                        className="bg-gray-50 border-gray-300 text-gray-800 placeholder-gray-400 focus:border-gray-500 focus:ring-gray-200"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-gray-700 font-medium">
                      Phone
                    </FormLabel>
                    <FormControl>
                      <Input
                        placeholder="e.g., +61 412 345 678"
                        {...field}
                        className="bg-gray-50 border-gray-300 text-gray-800 placeholder-gray-400 focus:border-gray-500 focus:ring-gray-200"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="space-y-2">
                <div className="text-gray-700 font-medium">Availability</div>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
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
                      className="flex items-center gap-2 text-sm text-gray-800"
                    >
                      <input
                        type="checkbox"
                        checked={form.watch(`availability.${day}`)}
                        onChange={(e) =>
                          form.setValue(
                            `availability.${day}`,
                            e.target.checked,
                            {
                              shouldDirty: true,
                            }
                          )
                        }
                      />
                      {day}
                    </label>
                  ))}
                </div>
              </div>

              <Button
                type="submit"
                className="w-full bg-gray-800 text-white hover:bg-gray-900 transition-colors duration-200"
                disabled={form.formState.isSubmitting}
              >
                Add Employee
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
