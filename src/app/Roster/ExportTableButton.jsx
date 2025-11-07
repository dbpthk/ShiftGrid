"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import jsPDF from "jspdf";
import {
  createSlotArray,
  formatSegmentsForDisplay,
  mapRosterEntriesToSlots,
} from "@/lib/slot-utils";

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

      const assignmentsByDayRole = {};
      weekDays.forEach((day) => {
        assignmentsByDayRole[day.date] = {
          Chef: [],
          "Kitchen Hand": [],
        };
      });

      const sortedExisting = existing
        .slice()
        .sort((a, b) => {
          const dateCompare = String(a.shift_date).localeCompare(
            String(b.shift_date)
          );
          if (dateCompare !== 0) return dateCompare;
          const roleCompare = String(a.role || "").localeCompare(
            String(b.role || "")
          );
          if (roleCompare !== 0) return roleCompare;
          const startCompare = String(a.shift_start || "").localeCompare(
            String(b.shift_start || "")
          );
          if (startCompare !== 0) return startCompare;
          return (a.id || 0) - (b.id || 0);
        });

      sortedExisting.forEach((roster) => {
        const dayAssignments = assignmentsByDayRole[roster.shift_date];
        if (!dayAssignments || !roster.role) return;
        if (!dayAssignments[roster.role]) return;
        dayAssignments[roster.role].push(roster);
      });

      // Helper functions
      const parseTimeToMins = (str) => {
        if (!str) return null;
        const [h, m] = str.split(":");
        return Number(h) * 60 + Number(m);
      };
      function slotDurationMins(slot, closing) {
        return slotSegmentsDurationMinutes(slot, closing, parseTimeToMins);
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

      // Fill in actual shifts aligned with slots
      weekDays.forEach((day) => {
        const req = requirements[day.dayName] || {};
        const chefSlots = createSlotArray(req.chef_slots, req.required_chefs);
        const khSlots = createSlotArray(
          req.kitchen_slots,
          req.required_kitchen_hands
        );

        const chefAssignments = mapRosterEntriesToSlots(
          chefSlots,
          assignmentsByDayRole[day.date]?.Chef || []
        );
        const khAssignments = mapRosterEntriesToSlots(
          khSlots,
          assignmentsByDayRole[day.date]?.["Kitchen Hand"] || []
        );

        chefSlots.forEach((slot, slotIdx) => {
          const segments = slot.segments || [];
          const assignments = Array.isArray(chefAssignments?.[slotIdx])
            ? chefAssignments[slotIdx]
            : [];
          segments.forEach((segment, segIdx) => {
            const entry = assignments[segIdx];
            if (!entry) return;
            const employeeEntry = employeeRosters[entry.employee_id];
            if (!employeeEntry) return;
            employeeEntry.week[day.date].shifts.push({
              role: "Chef",
              time: formatSegmentsForDisplay(
                { segments: [segment] },
                closingMap[day.dayName]
              ),
            });
          });
        });

        khSlots.forEach((slot, slotIdx) => {
          const segments = slot.segments || [];
          const assignments = Array.isArray(khAssignments?.[slotIdx])
            ? khAssignments[slotIdx]
            : [];
          segments.forEach((segment, segIdx) => {
            const entry = assignments[segIdx];
            if (!entry) return;
            const employeeEntry = employeeRosters[entry.employee_id];
            if (!employeeEntry) return;
            employeeEntry.week[day.date].shifts.push({
              role: "Kitchen Hand",
              time: formatSegmentsForDisplay(
                { segments: [segment] },
                closingMap[day.dayName]
              ),
            });
          });
        });
      });

      // Compute per-day and week total hours based on actual assigned segments
      const calcSegmentMinutes = (segments, closingTime, assignments) => {
        if (!Array.isArray(segments)) return 0;
        let mins = 0;
        segments.forEach((segment, idx) => {
          const entry = assignments?.[idx];
          if (!entry || !segment?.start) return;
          const start = parseTimeToMins(segment.start);
          if (start == null) return;
          const end = segment.end_is_closing
            ? parseTimeToMins(closingTime)
            : parseTimeToMins(segment.end);
          if (end == null) return;
          let diff = end - start;
          if (diff < 0) diff += 24 * 60;
          mins += diff;
        });
        return mins;
      };

      const reqMap = requirements;
      const allDayTotals = [];
      weekDays.forEach((day) => {
        const req = reqMap[day.dayName] || {};
        const closingTime = closingMap[day.dayName];
        const chefSlots = createSlotArray(req.chef_slots, req.required_chefs);
        const kitchenSlots = createSlotArray(
          req.kitchen_slots,
          req.required_kitchen_hands
        );
        const chefAssignments = mapRosterEntriesToSlots(
          chefSlots,
          assignmentsByDayRole[day.date]?.Chef || []
        );
        const kitchenAssignments = mapRosterEntriesToSlots(
          kitchenSlots,
          assignmentsByDayRole[day.date]?.["Kitchen Hand"] || []
        );

        let mins = 0;
        chefSlots.forEach((slot, idx) => {
          mins += calcSegmentMinutes(
            slot.segments,
            closingTime,
            chefAssignments[idx]
          );
        });
        kitchenSlots.forEach((slot, idx) => {
          mins += calcSegmentMinutes(
            slot.segments,
            closingTime,
            kitchenAssignments[idx]
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
          const chefSlots = createSlotArray(
            req.chef_slots,
            req.required_chefs
          );
          const khSlots = createSlotArray(
            req.kitchen_slots,
            req.required_kitchen_hands
          );

          const chefAssignments = mapRosterEntriesToSlots(
            chefSlots,
            assignmentsByDayRole[day.date]?.Chef || []
          );
          const khAssignments = mapRosterEntriesToSlots(
            khSlots,
            assignmentsByDayRole[day.date]?.["Kitchen Hand"] || []
          );

          const parts = [];
          const accumulate = (slot, assignmentGroup) => {
            const segments = slot?.segments || [];
            segments.forEach((segment, segIdx) => {
              const entry = assignmentGroup?.[segIdx];
              if (!entry || entry.employee_id !== emp.id) return;
              const label = formatSegmentsForDisplay(
                { segments: [segment] },
                closingMap[day.dayName]
              );
              if (label) parts.push(label);
              const start = parseTimeToMins(segment.start);
              if (start == null) return;
              const end = segment.end_is_closing
                ? parseTimeToMins(closingMap[day.dayName])
                : parseTimeToMins(segment.end);
              if (end == null) return;
              let diff = end - start;
              if (diff < 0) diff += 24 * 60;
              perDayTotals[colIdx] += diff / 60;
              weekTotalSlots += diff / 60;
            });
          };

          chefSlots.forEach((slot, i) => {
            accumulate(slot, chefAssignments[i]);
          });
          khSlots.forEach((slot, i) => {
            accumulate(slot, khAssignments[i]);
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
