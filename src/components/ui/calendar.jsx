import * as React from "react";
import { DayPicker } from "react-day-picker";
import "react-day-picker/dist/style.css";

function cn(...classes) {
  return classes.filter(Boolean).join(" ");
}

export function Calendar({ className, classNames, showOutsideDays = true, ...props }) {
  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn("p-3 bg-white", className)}
      classNames={{
        months: "flex flex-col space-y-4 sm:flex-row sm:space-x-4 sm:space-y-0",
        month: "space-y-4",
        caption: "flex justify-center pt-1 relative items-center",
        caption_label: "text-sm font-semibold uppercase tracking-wide",
        nav: "space-x-2 flex items-center",
        nav_button:
          "inline-flex h-8 w-8 items-center justify-center rounded-md border border-transparent bg-transparent p-0 text-sm font-medium text-muted-foreground transition-colors hover:bg-gray-100 hover:text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
        nav_button_previous: "absolute left-1",
        nav_button_next: "absolute right-1",
        table: "w-full border-collapse space-y-1",
        head_row: "flex",
        head_cell: "text-muted-foreground rounded-md w-9 font-semibold text-[0.7rem] uppercase tracking-wide",
        row: "flex w-full mt-2",
        cell: "relative h-9 w-9 text-center text-sm focus-within:relative focus-within:z-20",
        day:
          "inline-flex h-9 w-9 items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        day_today: "bg-gray-900 text-white",
        day_selected:
          "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground",
        day_outside: "text-muted-foreground opacity-40",
        day_disabled: "text-muted-foreground opacity-40",
        day_range_start: "day-range-start",
        day_range_end: "day-range-end",
        day_hidden: "invisible",
        ...classNames,
      }}
      {...props}
    />
  );
}
