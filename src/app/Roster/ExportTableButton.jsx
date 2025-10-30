"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import jsPDF from "jspdf";

export default function ExportTableButton({
  weekDays,
  employees,
  employeeAvailability,
  requirements,
  existing,
}) {
  const [isExporting, setIsExporting] = React.useState(false);

  const generateTablePDF = async () => {
    setIsExporting(true);
    try {
      // Fetch business_hours for closing times
      const businessHoursRes = await fetch("/api/business-hours");
      const businessHoursData = await businessHoursRes.json();
      const closingMap = {};
      if (Array.isArray(businessHoursData.data)) {
        businessHoursData.data.forEach((row) => {
          closingMap[row.day_of_week] = row.closing_time;
        });
      }

      // Helper functions
      function parseTimeToMins(str) {
        if (!str) return null;
        const [h, m] = str.split(":");
        return Number(h) * 60 + Number(m);
      }
      function slotDurationMins(start, end, endIsClosing, closing) {
        if (!start) return 0;
        if (endIsClosing) {
          if (!closing) return 0;
          return parseTimeToMins(closing) - parseTimeToMins(start);
        }
        if (!end) return 0;
        const s = parseTimeToMins(start);
        const e = parseTimeToMins(end);
        if (s == null || e == null) return 0;
        let diff = e - s;
        if (diff < 0) diff += 24 * 60;
        return diff;
      }

      const doc = new jsPDF("landscape", "mm", "a4");
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      let yPosition = 20;

      // Title
      doc.setFontSize(24);
      doc.setFont("helvetica", "bold");
      doc.text("SHIFTGRID", pageWidth / 2, yPosition, { align: "center" });
      yPosition += 15;

      // Date range
      const startDate = new Date(weekDays[0].date).toLocaleDateString();
      const endDate = new Date(weekDays[6].date).toLocaleDateString();
      doc.setFontSize(12);
      doc.setFont("helvetica", "normal");
      doc.text(`${startDate} - ${endDate}`, pageWidth / 2, yPosition, {
        align: "center",
      });
      yPosition += 20;

      // Group rosters by day and employee
      const employeeRosters = {};
      const allEmployeeIds = new Set();

      // Initialize all employees
      employees.forEach((emp) => {
        allEmployeeIds.add(emp.id);
        employeeRosters[emp.id] = {
          name: emp.name,
          week: {},
        };
        weekDays.forEach((day) => {
          employeeRosters[emp.id].week[day.date] = {
            shifts: [],
          };
        });
      });

      // Fill in actual shifts
      existing.forEach((roster) => {
        if (employeeRosters[roster.employee_id]) {
          const shiftTime = `${String(roster.shift_start).slice(0, 5)}-${String(
            roster.shift_end
          ).slice(0, 5)}`;
          employeeRosters[roster.employee_id].week[
            roster.shift_date
          ].shifts.push({
            role: roster.role,
            time: shiftTime,
          });
        }
      });

      // Compute per-day and week total hours based on actual assigned slots
      // We want to traverse requirements and existing
      const reqMap = requirements;
      const allDayTotals = [];
      weekDays.forEach((day) => {
        let mins = 0;
        const req = reqMap[day.dayName] || {};
        // Chef slots
        (req.chef_slots || []).forEach((slot, i) => {
          // Find if assigned
          const assigned = existing.find(
            (r) =>
              r.shift_date === day.date &&
              r.role === "Chef" &&
              r.shift_start.startsWith((slot.start || "").slice(0, 5))
          );
          if (!assigned) return;
          if (!slot.start) return;
          let shiftEnd = slot.end;
          let isClosing = slot.end_is_closing;
          if (isClosing) shiftEnd = closingMap[day.dayName];
          mins += slotDurationMins(
            slot.start,
            shiftEnd,
            isClosing,
            closingMap[day.dayName]
          );
        });
        // Kitchen Hand slots
        (req.kitchen_slots || []).forEach((slot, i) => {
          const assigned = existing.find(
            (r) =>
              r.shift_date === day.date &&
              r.role === "Kitchen Hand" &&
              r.shift_start.startsWith((slot.start || "").slice(0, 5))
          );
          if (!assigned) return;
          if (!slot.start) return;
          let shiftEnd = slot.end;
          let isClosing = slot.end_is_closing;
          if (isClosing) shiftEnd = closingMap[day.dayName];
          mins += slotDurationMins(
            slot.start,
            shiftEnd,
            isClosing,
            closingMap[day.dayName]
          );
        });
        allDayTotals.push(mins / 60);
      });
      const weekTotal = allDayTotals.reduce((a, b) => a + b, 0);

      // Table setup
      const tableStartX = 20;
      const nameColumnWidth = 30;
      const dayColumnWidth = (pageWidth - 20 - nameColumnWidth) / 7;
      const rowHeight = 8;

      // Draw table headers
      doc.setFontSize(10);
      doc.setFont("helvetica", "bold");

      // NAME header
      doc.rect(tableStartX, yPosition - 5, nameColumnWidth, rowHeight);
      doc.text("NAME", tableStartX + 2, yPosition);

      // Day headers
      weekDays.forEach((day, index) => {
        const x = tableStartX + nameColumnWidth + index * dayColumnWidth;
        doc.rect(x, yPosition - 5, dayColumnWidth, rowHeight);

        // Day name
        doc.setFontSize(8);
        doc.text(day.dayName.toUpperCase(), x + 1, yPosition - 2);

        // Date
        const date = new Date(day.date).getDate();
        doc.text(date.toString(), x + 1, yPosition + 2);
      });

      yPosition += rowHeight;

      // Build rows per employee (first column is NAME)
      let perDayTotals = Array(7).fill(0);
      let weekTotalSlots = 0;

      employees.forEach((emp) => {
        // new page if needed
        if (yPosition > pageHeight - 20) {
          doc.addPage();
          yPosition = 20;
          // redraw headers row (optional: skipping for brevity)
        }
        // Draw name cell
        doc.rect(tableStartX, yPosition - 5, nameColumnWidth, rowHeight);
        doc.text(String(emp.name).toUpperCase(), tableStartX + 2, yPosition);

        // Day cells
        weekDays.forEach((day, colIdx) => {
          const x = tableStartX + nameColumnWidth + colIdx * dayColumnWidth;
          doc.rect(x, yPosition - 5, dayColumnWidth, rowHeight);

          const req = requirements[day.dayName] || {};
          const chefSlots = req.chef_slots || [];
          const khSlots = req.kitchen_slots || [];

          const chefAssignments = existing.filter(
            (r) => r.shift_date === day.date && r.role === "Chef"
          );
          const khAssignments = existing.filter(
            (r) => r.shift_date === day.date && r.role === "Kitchen Hand"
          );

          const parts = [];
          // Chef slots by index
          chefSlots.forEach((slot, i) => {
            const assigned = chefAssignments[i];
            if (!assigned || assigned.employee_id !== emp.id) return;
            let end = slot.end;
            const isClosing = slot.end_is_closing;
            if (isClosing) end = closingMap[day.dayName];
            const label = slot.start
              ? isClosing
                ? `${String(slot.start).slice(0, 5)}-closing`
                : `${String(slot.start).slice(0, 5)}-${
                    end ? String(end).slice(0, 5) : "--"
                  }`
              : "";
            if (label) parts.push(label);
            const mins = slot.start
              ? slotDurationMins(
                  slot.start,
                  end,
                  isClosing,
                  closingMap[day.dayName]
                )
              : 0;
            if (mins > 0)
              (perDayTotals[colIdx] += mins / 60),
                (weekTotalSlots += mins / 60);
          });
          // KH slots by index
          khSlots.forEach((slot, i) => {
            const assigned = khAssignments[i];
            if (!assigned || assigned.employee_id !== emp.id) return;
            let end = slot.end;
            const isClosing = slot.end_is_closing;
            if (isClosing) end = closingMap[day.dayName];
            const label = slot.start
              ? isClosing
                ? `${String(slot.start).slice(0, 5)}-closing`
                : `${String(slot.start).slice(0, 5)}-${
                    end ? String(end).slice(0, 5) : "--"
                  }`
              : "";
            if (label) parts.push(label);
            const mins = slot.start
              ? slotDurationMins(
                  slot.start,
                  end,
                  isClosing,
                  closingMap[day.dayName]
                )
              : 0;
            if (mins > 0)
              (perDayTotals[colIdx] += mins / 60),
                (weekTotalSlots += mins / 60);
          });

          if (parts.length) {
            doc.text(parts.join(", "), x + 2, yPosition);
          }
        });

        yPosition += rowHeight;
      });

      // Per-day totals and week total
      if (yPosition > pageHeight - 15) {
        doc.addPage();
        yPosition = 20;
      }
      doc.setFont("helvetica", "bold");
      doc.text("TOTAL HRS", tableStartX + 2, yPosition);
      weekDays.forEach((day, index) => {
        const x = tableStartX + nameColumnWidth + index * dayColumnWidth;
        doc.text(perDayTotals[index].toFixed(1), x + 1, yPosition);
      });
      yPosition += rowHeight + 2;
      doc.text(
        `TOTAL ROSTERED HOURS FOR WEEK: ${weekTotalSlots.toFixed(1)}`,
        tableStartX,
        yPosition
      );

      // Footer
      const footerY = pageHeight - 10;
      doc.setFontSize(8);
      doc.setFont("helvetica", "normal");
      doc.text(
        `Generated on ${new Date().toLocaleString()}`,
        pageWidth / 2,
        footerY,
        { align: "center" }
      );

      // Save the PDF
      const fileName = `roster-table-${weekDays[0].date}-to-${weekDays[6].date}.pdf`;
      doc.save(fileName);
    } catch (error) {
      console.error("Error generating PDF:", error);
      alert("Error generating PDF. Please try again.");
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Button
      onClick={generateTablePDF}
      disabled={isExporting}
      variant="outline"
      className="flex items-center gap-2"
    >
      {isExporting ? (
        <>
          <div className="w-4 h-4 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin" />
          Exporting...
        </>
      ) : (
        <>
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2h2a2 2 0 002-2z"
            />
          </svg>
          Export Table
        </>
      )}
    </Button>
  );
}
