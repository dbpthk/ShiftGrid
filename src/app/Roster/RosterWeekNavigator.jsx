"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

function normalizeToMonday(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  const day = date.getDay();
  const mondayOffset = day === 0 ? -6 : 1 - day;
  date.setDate(date.getDate() + mondayOffset);
  date.setHours(0, 0, 0, 0);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const dayOfMonth = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${dayOfMonth}`;
}

export default function RosterWeekNavigator({ initialStart }) {
  const router = useRouter();
  const [value, setValue] = React.useState(initialStart);
  const [isPending, startTransition] = React.useTransition();

  React.useEffect(() => {
    setValue(initialStart);
  }, [initialStart]);

  const onSubmit = (event) => {
    event.preventDefault();
    if (!value) return;
    const normalized = normalizeToMonday(value);
    setValue(normalized);
    const params = new URLSearchParams(window.location.search);
    params.set("weekStart", normalized);
    const href = `/Roster?${params.toString()}`;
    startTransition(() => {
      router.replace(href);
      router.refresh();
    });
  };

  return (
    <form onSubmit={onSubmit} className="flex flex-wrap items-end gap-3">
      <div className="flex flex-col">
        <label
          htmlFor="week-start"
          className="text-xs font-medium uppercase text-gray-600"
        >
          Week starting
        </label>
        <input
          id="week-start"
          type="date"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-gray-500 focus:outline-none"
        />
      </div>
      <Button type="submit" disabled={isPending} className="text-sm">
        {isPending ? "Loading..." : "Go"}
      </Button>
    </form>
  );
}
