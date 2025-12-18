"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import ExcelJS from "exceljs";
import { saveAs } from "file-saver";
import {
  createSlotArray,
  formatSegmentsForDisplay,
  mapRosterEntriesToSlots,
} from "@/lib/slot-utils";

const BUSINESS_TITLE =
  process.env.NEXT_PUBLIC_BUSINESS_NAME || "Granata's Liverpool";

export default function ExportTableButton({
  weekDays,
  employees,
  requirements,
  existing,
}) {
  const [isExporting, setIsExporting] = React.useState(false);

  const downloadExcel = async () => {
    const titleInput = window.prompt(
      "Enter a title for the exported roster",
      BUSINESS_TITLE
    );
    if (titleInput === null) {
      return;
    }
    const title = titleInput.trim() || BUSINESS_TITLE;

    const dateLabelInput = window.prompt(
      "Enter a subtitle/date range for the roster",
      ""
    );
    const dateLabel = (dateLabelInput || "").trim();

    setIsExporting(true);
    try {
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
        assignmentsByDayRole[day.date] = { Chef: [], "Kitchen Hand": [] };
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
        dayAssignments[roster.role]?.push(roster);
      });

      const startDate = new Date(weekDays[0].date);
      const endDate = new Date(weekDays[6].date);

      const totalColumns = weekDays.length + 1;

      const workbook = new ExcelJS.Workbook();
      workbook.creator = "ShiftGrid";
      workbook.created = new Date();
      const worksheet = workbook.addWorksheet("Roster", {
        properties: { defaultRowHeight: 32 },
        views: [{ state: "frozen", ySplit: 4 }],
        pageSetup: { paperSize: 9, orientation: "landscape" },
      });

      const columnDefinitions = [
        { header: "NAME", key: "name", width: 24 },
        ...weekDays.map((day) => {
          return {
            header: day.dayName.slice(0, 3).toUpperCase(),
            key: day.date,
            width: 18,
          };
        }),
      ];
      worksheet.columns = columnDefinitions;

      const titleRow = worksheet.addRow([title.toUpperCase()]);
      worksheet.mergeCells(1, 1, 1, totalColumns);
      titleRow.height = 30;
      titleRow.font = { name: "Calibri", bold: true, size: 22 };
      titleRow.alignment = { horizontal: "center", vertical: "middle" };
      titleRow.getCell(1).alignment = { horizontal: "center", vertical: "middle" };

      const defaultDateRange = `${startDate.toLocaleDateString()} - ${endDate.toLocaleDateString()}`;
      const dateRow = worksheet.addRow([
        dateLabel || defaultDateRange,
      ]);
      worksheet.mergeCells(2, 1, 2, totalColumns);
      dateRow.height = 24;
      dateRow.font = { name: "Calibri", italic: true, size: 13 };
      dateRow.alignment = { horizontal: "center", vertical: "middle" };
      dateRow.getCell(1).alignment = { horizontal: "center", vertical: "middle" };

      worksheet.addRow([]);

      const headerValues = [
        "NAME",
        ...weekDays.map((day) => {
          return `${day.dayName.slice(0, 3).toUpperCase()}`;
        }),
      ];
      const headerRow = worksheet.addRow(headerValues);

      headerRow.eachCell((cell) => {
        cell.font = {
          name: "Calibri",
          bold: true,
          size: 12,
          color: { argb: "333333" },
        };
        cell.alignment = { horizontal: "center", vertical: "middle" };
        cell.border = {
          top: { style: "thin", color: { argb: "444444" } },
          bottom: { style: "thin", color: { argb: "444444" } },
          left: { style: "thin", color: { argb: "444444" } },
          right: { style: "thin", color: { argb: "444444" } },
        };
      });

      const hasNotes = weekDays.some((day) => {
        const note = requirements[day.dayName]?.notes;
        return Boolean(note && note.trim());
      });

      if (hasNotes) {
        const notesRowValues = [
          "",
          ...weekDays.map((day) => requirements[day.dayName]?.notes || ""),
        ];
        const notesRow = worksheet.addRow(notesRowValues);
        notesRow.height = 24;
        notesRow.eachCell((cell, colNumber) => {
          cell.font = { name: "Calibri", size: 10, italic: true, color: { argb: "555555" } };
          cell.alignment = {
            vertical: "top",
            horizontal: colNumber === 1 ? "left" : "left",
            wrapText: true,
          };
          if (colNumber > 1) {
            cell.border = {
              top: { style: "dotted", color: { argb: "CCCCCC" } },
              bottom: { style: "dotted", color: { argb: "CCCCCC" } },
              left: { style: "dotted", color: { argb: "CCCCCC" } },
              right: { style: "dotted", color: { argb: "CCCCCC" } },
            };
          }
        });
      }

      const resolveCellValue = (day, employeeId) => {
        const req = requirements[day.dayName] || {};
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

        const segments = [];

        chefSlots.forEach((slot, slotIdx) => {
          const assignments = chefAssignments[slotIdx];
          slot?.segments?.forEach((segment, segIdx) => {
            const entry = assignments?.[segIdx];
            if (!entry || entry.employee_id !== employeeId) return;
            segments.push(
              formatSegmentsForDisplay(
                { segments: [segment] },
                closingMap[day.dayName]
              )
            );
          });
        });

        kitchenSlots.forEach((slot, slotIdx) => {
          const assignments = kitchenAssignments[slotIdx];
          slot?.segments?.forEach((segment, segIdx) => {
            const entry = assignments?.[segIdx];
            if (!entry || entry.employee_id !== employeeId) return;
            segments.push(
              formatSegmentsForDisplay(
                { segments: [segment] },
                closingMap[day.dayName]
              )
            );
          });
        });

        return segments.length ? segments.join("\n") : "off";
      };

      const sortedEmployees = [...employees].sort((a, b) =>
        String(a.name || "").localeCompare(String(b.name || ""), undefined, {
          sensitivity: "base",
        })
      );

      sortedEmployees.forEach((employee) => {
        const rowValues = [
          String(employee.name).toUpperCase(),
          ...weekDays.map((day) => resolveCellValue(day, employee.id)),
        ];
        const row = worksheet.addRow(rowValues);
        row.height = 36;
        row.eachCell((cell, colNumber) => {
          cell.font = { name: "Calibri", size: 11 };
          cell.alignment = {
            vertical: "top",
            horizontal: colNumber === 1 ? "left" : "center",
            wrapText: true,
          };
          cell.border = {
            top: { style: "thin", color: { argb: "CCCCCC" } },
            bottom: { style: "thin", color: { argb: "CCCCCC" } },
            left: { style: "thin", color: { argb: "CCCCCC" } },
            right: { style: "thin", color: { argb: "CCCCCC" } },
          };
          if (cell.value === "off") {
            cell.font = { name: "Calibri", size: 11, color: { argb: "888888" } };
          }
        });
      });

      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      const fileName = `roster-${weekDays[0].date}-to-${weekDays[6].date}.xlsx`;
      saveAs(blob, fileName);
    } catch (error) {
      console.error("Error generating Excel:", error);
      alert("Error generating Excel. Please try again.");
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Button
      onClick={downloadExcel}
      disabled={isExporting}
      variant="outline"
      className="flex items-center gap-2"
    >
      {isExporting ? (
        <>
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-gray-300 border-t-gray-600" />
          Exporting...
        </>
      ) : (
        <>
          <svg
            className="h-4 w-4"
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
          Export Table
        </>
      )}
    </Button>
  );
}
