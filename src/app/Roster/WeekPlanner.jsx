"use client";

import React from "react";
import { addDays, format, startOfWeek } from "date-fns";
import { usePathname, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from "@/components/ui/alert-dialog";

const toISO = (date) => format(date, "yyyy-MM-dd");
const parseDateValue = (value) => {
  if (!value) return null;
  const [yearStr, monthStr, dayStr] = value.split("-");
  const year = Number(yearStr);
  const month = Number(monthStr) - 1;
  const day = Number(dayStr);
  if (Number.isNaN(year) || Number.isNaN(month) || Number.isNaN(day)) {
    return null;
  }
  const date = new Date(year, month, day, 0, 0, 0, 0);
  return Number.isNaN(date.getTime()) ? null : date;
};

export default function WeekPlanner({ currentWeekIso }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [open, setOpen] = React.useState(false);
  const [dateValue, setDateValue] = React.useState(currentWeekIso ?? "");
  const [copyPrevious, setCopyPrevious] = React.useState(false);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const closeDialog = () => {
    setOpen(false);
  };

  const navigateToWeek = (iso) => {
    const href = `/Roster?weekStart=${iso}`;
    window.location.assign(href);
  };

  const handleOpenChange = (next) => {
    setOpen(next);
    if (next) {
      setDateValue(currentWeekIso ?? "");
      setCopyPrevious(false);
    }
  };

  const handleSubmit = async () => {
    if (!dateValue) {
      toast.error("Please select a date");
      return;
    }
    const picked = parseDateValue(dateValue);
    if (!picked) {
      toast.error("Invalid date");
      return;
    }
    const monday = startOfWeek(picked, { weekStartsOn: 1 });
    const targetIso = toISO(monday);
    setDateValue(targetIso);

    setIsSubmitting(true);
    if (copyPrevious) {
      const sourceMonday = addDays(monday, -7);
      const response = await fetch("/api/rosters/duplicate-week", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sourceWeekStart: toISO(sourceMonday),
          targetWeekStart: targetIso,
        }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok || !result?.success) {
        toast.error(result?.error || "Unable to copy previous roster");
        setIsSubmitting(false);
        return;
      }
      toast.success("Roster copied to selected week");
    } else {
      toast.success("Week ready to edit");
    }

    closeDialog();
    navigateToWeek(targetIso);
  };

  return (
    <AlertDialog open={open} onOpenChange={handleOpenChange}>
      <AlertDialogTrigger asChild>
        <Button variant="secondary">Plan Another Week</Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Create or Reuse a Week</AlertDialogTitle>
          <AlertDialogDescription>
            Pick the starting Monday for the roster. You can optionally copy the roster from the previous week.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="space-y-4">
          <div className="flex flex-col gap-2">
            <label htmlFor="planner-date" className="text-xs font-medium uppercase text-gray-600">
              Week starting
            </label>
            <input
              id="planner-date"
              type="date"
              value={dateValue}
              onChange={(event) => setDateValue(event.target.value)}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-gray-500 focus:outline-none"
            />
          </div>
          <label className="flex items-center gap-2 text-sm text-gray-700">
            <input
              type="checkbox"
              checked={copyPrevious}
              onChange={(event) => setCopyPrevious(event.target.checked)}
            />
            Copy the roster from the previous week
          </label>
        </div>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isSubmitting}>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? "Working..." : "Continue"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
