"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import jsPDF from "jspdf";

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
      const durationMins = (start, end, endIsClosing, dayName) => {
        if (!start) return 0;
        if (endIsClosing) {
          const closing = closingMap[dayName];
          if (!closing) return 0;
          return parseMins(closing) - parseMins(start);
        }
        if (!end) return 0;
        let diff = parseMins(end) - parseMins(start);
        if (diff < 0) diff += 24 * 60;
        return diff;
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
      existing.forEach((r) => {
        const d = rostersByDay[r.shift_date];
        if (d && r.role) {
          const emp = employees.find((e) => e.id === r.employee_id);
          d[r.role].push({
            id: r.id,
            name: emp?.name || `Emp ${r.employee_id}`,
          });
        }
      });

      // Precompute day payloads (slots, assignments, totals) from requirements + rosters
      const computedDays = weekDays.map((day) => {
        const req = requirements[day.dayName] || {};
        const chefSlots = Array.isArray(req.chef_slots) ? req.chef_slots : [];
        const khSlots = Array.isArray(req.kitchen_slots)
          ? req.kitchen_slots
          : [];
        const assignedChefs = rostersByDay[day.date]?.["Chef"] || [];
        const assignedKH = rostersByDay[day.date]?.["Kitchen Hand"] || [];
        // compute total mins for the day based on slot definitions
        let dayMins = 0;
        chefSlots.forEach((s) => {
          dayMins += durationMins(
            s.start,
            s.end,
            s.end_is_closing,
            day.dayName
          );
        });
        khSlots.forEach((s) => {
          dayMins += durationMins(
            s.start,
            s.end,
            s.end_is_closing,
            day.dayName
          );
        });
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
            let end = slot.end;
            const isClosing = slot.end_is_closing;
            if (isClosing) end = closingMap[day.dayName];
            const employeeName = assignedChefs[i]?.name || "Unassigned";
            const timeLabel = slot.start
              ? isClosing
                ? `${String(slot.start).slice(0, 5)} - closing`
                : `${String(slot.start).slice(0, 5)} - ${
                    end ? String(end).slice(0, 5) : "--"
                  }`
              : "";
            const line = `- C${i + 1}  ${timeLabel}  ${employeeName}`;
            if (employeeName === "Unassigned") doc.setTextColor(150, 0, 0);
            doc.text(line, 18, yPosition);
            doc.setTextColor(0);
            yPosition += 7;
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
            let end = slot.end;
            const isClosing = slot.end_is_closing;
            if (isClosing) end = closingMap[day.dayName];
            const employeeName = assignedKH[i]?.name || "Unassigned";
            const timeLabel = slot.start
              ? isClosing
                ? `${String(slot.start).slice(0, 5)} - closing`
                : `${String(slot.start).slice(0, 5)} - ${
                    end ? String(end).slice(0, 5) : "--"
                  }`
              : "";
            const line = `- KH${i + 1}  ${timeLabel}  ${employeeName}`;
            if (employeeName === "Unassigned") doc.setTextColor(150, 0, 0);
            doc.text(line, 18, yPosition);
            doc.setTextColor(0);
            yPosition += 7;
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
