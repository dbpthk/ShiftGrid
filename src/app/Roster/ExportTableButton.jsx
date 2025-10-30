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

      // Draw employee rows
      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");

      Object.values(employeeRosters).forEach((employee) => {
        // Check if we need a new page
        if (yPosition > pageHeight - 20) {
          doc.addPage();
          yPosition = 20;
        }

        // Employee name cell
        doc.rect(tableStartX, yPosition - 5, nameColumnWidth, rowHeight);
        doc.text(employee.name.toUpperCase(), tableStartX + 2, yPosition);

        // Day cells
        weekDays.forEach((day, index) => {
          const x = tableStartX + nameColumnWidth + index * dayColumnWidth;
          doc.rect(x, yPosition - 5, dayColumnWidth, rowHeight);

          const dayShifts = employee.week[day.date].shifts;
          if (dayShifts.length > 0) {
            // Combine all shifts for the day
            const shiftText = dayShifts.map((shift) => shift.time).join(", ");
            doc.text(shiftText, x + 1, yPosition);
          } else {
            // Check if employee is available but not assigned
            const empDays = employeeAvailability.get(employee.id) || [];
            if (empDays.includes(day.dayName)) {
              doc.text("off", x + 1, yPosition);
            }
          }
        });

        yPosition += rowHeight;
      });

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
