"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import jsPDF from "jspdf";
import {
  createSlotArray,
  formatSegmentsForDisplay,
  mapRosterEntriesToSlots,
} from "@/lib/slot-utils";

export default function ExportRosterButton({
  weekDays,
  employees,
  employeeAvailability,
  requirements,
  existing,
}) {
  const [isExporting, setIsExporting] = React.useState(false);

  const generatePDF = async () => {
    setIsExporting(true);
    try {
      // Fetch business hours for closing
      const resp = await fetch("/api/business-hours");
      const data = await resp.json();
      const closingMap = {};
      if (Array.isArray(data?.data)) {
        data.data.forEach((r) => (closingMap[r.day_of_week] = r.closing_time));
      }

      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      let yPosition = 20;

      // Helpers
      const parseMins = (s) => {
        if (!s) return null;
        const [h, m] = String(s).split(":");
        return Number(h) * 60 + Number(m);
      };

      // Title
      doc.setFontSize(20);
      doc.setFont("helvetica", "bold");
      doc.text("Weekly Roster", pageWidth / 2, yPosition, { align: "center" });
      yPosition += 15;

      // Date range
      const startDate = new Date(weekDays[0].date).toLocaleDateString();
      const endDate = new Date(weekDays[6].date).toLocaleDateString();
      doc.setFontSize(12);
      doc.setFont("helvetica", "normal");
      doc.text(`${startDate} - ${endDate}`, pageWidth / 2, yPosition, {
        align: "center",
      });
      yPosition += 10;

      // Build rosters by day/role
      const rostersByDay = {};
      weekDays.forEach((day) => {
        rostersByDay[day.date] = { Chef: [], "Kitchen Hand": [] };
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
      sortedExisting.forEach((r) => {
        const d = rostersByDay[r.shift_date];
        if (d && r.role && d[r.role]) {
          const emp = employees.find((e) => e.id === r.employee_id);
          d[r.role].push({
            id: r.id,
            employee_id: r.employee_id,
            name: emp?.name || `Emp ${r.employee_id}`,
          });
        }
      });

      // Precompute day payloads (slots, assignments, totals) from requirements + rosters
      const computedDays = weekDays.map((day) => {
        const req = requirements[day.dayName] || {};
        const chefSlots = createSlotArray(req.chef_slots, req.required_chefs);
        const khSlots = createSlotArray(
          req.kitchen_slots,
          req.required_kitchen_hands
        );
        const assignedChefs = mapRosterEntriesToSlots(
          chefSlots,
          rostersByDay[day.date]?.["Chef"] || []
        );
        const assignedKH = mapRosterEntriesToSlots(
          khSlots,
          rostersByDay[day.date]?.["Kitchen Hand"] || []
        );
        let dayMins = 0;
        const calc = (slot, assignments) => {
          const segments = slot?.segments || [];
          segments.forEach((segment, idx) => {
            const entry = assignments?.[idx];
            if (!entry || !segment?.start) return;
            const start = parseMins(segment.start);
            if (start == null) return;
            const end = segment.end_is_closing
              ? parseMins(closingMap[day.dayName])
              : parseMins(segment.end);
            if (end == null) return;
            let diff = end - start;
            if (diff < 0) diff += 24 * 60;
            dayMins += diff;
          });
        };
        chefSlots.forEach((slot, idx) => calc(slot, assignedChefs[idx]));
        khSlots.forEach((slot, idx) => calc(slot, assignedKH[idx]));
        return {
          dayName: day.dayName,
          date: day.date,
          chefSlots,
          khSlots,
          assignedChefs,
          assignedKH,
          dayMins,
        };
      });

      // Compute week total while rendering
      let weekHours = 0;

      // Clean, minimal styling (no emojis/special bullets, standard fonts only)
      const headerLine = () => {
        doc.setDrawColor(200, 200, 200);
        doc.setLineWidth(0.3);
        doc.line(10, yPosition, pageWidth - 10, yPosition);
      };

      computedDays.forEach((day, dayIdx) => {
        if (yPosition > pageHeight - 40) {
          doc.addPage();
          yPosition = 18;
        }
        const {
          chefSlots = [],
          khSlots = [],
          assignedChefs = [],
          assignedKH = [],
          dayMins = 0,
        } = day;

        // Day header
        doc.setFont("helvetica", "bold");
        doc.setFontSize(14);
        doc.setTextColor(0);
        doc.text(`${day.dayName} - ${day.date}`, 14, yPosition);
        yPosition += 5;
        headerLine();
        yPosition += 4;

        // Chef section
        doc.setFontSize(12);
        doc.text(`Chef (${chefSlots.length})`, 14, yPosition);
        yPosition += 8;
        doc.setFont("helvetica", "normal");
        doc.setFontSize(11);
        if (chefSlots.length === 0) {
          doc.setTextColor(120);
          doc.text(`- No chef slots`, 18, yPosition);
          doc.setTextColor(0);
          yPosition += 8;
        } else {
          chefSlots.forEach((slot, i) => {
            if (yPosition > pageHeight - 24) {
              doc.addPage();
              yPosition = 18;
            }
            const segments = slot.segments || [];
            const assignmentGroup = Array.isArray(assignedChefs[i])
              ? assignedChefs[i]
              : [];
            segments.forEach((segment, segIdx) => {
              const entry = assignmentGroup[segIdx];
              const employeeName = entry?.name || "Unassigned";
              const timeLabel = formatSegmentsForDisplay(
                { segments: [segment] },
                closingMap[day.dayName]
              );
              const line = `- C${i + 1}${segments.length > 1 ? `.${
                segIdx + 1
              }` : ""}  ${timeLabel}  ${employeeName}`;
              if (employeeName === "Unassigned") doc.setTextColor(150, 0, 0);
              doc.text(line, 18, yPosition);
              doc.setTextColor(0);
              yPosition += 7;
            });
          });
        }

        yPosition += 2;
        // Kitchen Hand section
        doc.setFont("helvetica", "bold");
        doc.setFontSize(12);
        doc.text(`Kitchen Hand (${khSlots.length})`, 14, yPosition);
        yPosition += 8;
        doc.setFont("helvetica", "normal");
        doc.setFontSize(11);
        if (khSlots.length === 0) {
          doc.setTextColor(120);
          doc.text(`- No kitchen hand slots`, 18, yPosition);
          doc.setTextColor(0);
          yPosition += 8;
        } else {
          khSlots.forEach((slot, i) => {
            if (yPosition > pageHeight - 24) {
              doc.addPage();
              yPosition = 18;
            }
            const segments = slot.segments || [];
            const assignmentGroup = Array.isArray(assignedKH[i])
              ? assignedKH[i]
              : [];
            segments.forEach((segment, segIdx) => {
              const entry = assignmentGroup[segIdx];
              const employeeName = entry?.name || "Unassigned";
              const timeLabel = formatSegmentsForDisplay(
                { segments: [segment] },
                closingMap[day.dayName]
              );
              const line = `- KH${i + 1}${segments.length > 1 ? `.${
                segIdx + 1
              }` : ""}  ${timeLabel}  ${employeeName}`;
              if (employeeName === "Unassigned") doc.setTextColor(150, 0, 0);
              doc.text(line, 18, yPosition);
              doc.setTextColor(0);
              yPosition += 7;
            });
          });
        }

        // Day total
        const dayHours = dayMins / 60;
        weekHours += dayHours;
        yPosition += 4;
        doc.setFont("helvetica", "bold");
        doc.setFontSize(11);
        doc.text(`Total Hours: ${dayHours.toFixed(1)}`, 14, yPosition);
        yPosition += 8;

        if (dayIdx < computedDays.length - 1) {
          headerLine();
          yPosition += 6;
        }
      });

      // Week footer summary
      if (yPosition > pageHeight - 20) {
        doc.addPage();
        yPosition = 18;
      }
      doc.setFont("helvetica", "bold");
      doc.setFontSize(12);
      doc.text(
        `TOTAL ROSTERED HOURS FOR WEEK: ${weekHours.toFixed(1)}`,
        14,
        pageHeight - 16
      );
      doc.setTextColor(0);

      // Save
      const fileName = `roster-${weekDays[0].date}-to-${weekDays[6].date}.pdf`;
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
      onClick={generatePDF}
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
              d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
          Export PDF
        </>
      )}
    </Button>
  );
}
