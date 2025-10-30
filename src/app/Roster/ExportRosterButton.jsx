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

  // Helper function to get available employees for a specific day and role
  const getAvailableEmployees = (dayName, role) => {
    const availableEmployees = employees.filter((emp) => {
      const empDays = employeeAvailability.get(emp.id) || [];
      const isAvailable = empDays.includes(dayName);

      if (!isAvailable) return false;

      // Role compatibility check
      const empRole = emp.role.toLowerCase();
      if (role === "Chef") {
        return empRole.includes("chef") || empRole.includes("head");
      } else if (role === "Kitchen Hand") {
        return (
          empRole.includes("chef") ||
          empRole.includes("kitchen") ||
          empRole.includes("hand")
        );
      }
      return false;
    });

    return availableEmployees;
  };

  const generatePDF = async () => {
    setIsExporting(true);
    try {
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      let yPosition = 20;

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
      yPosition += 20;

      // Group rosters by day and role
      const rostersByDay = {};
      weekDays.forEach((day) => {
        rostersByDay[day.date] = {
          Chef: [],
          "Kitchen Hand": [],
        };
      });

      existing.forEach((roster) => {
        const dayRosters = rostersByDay[roster.shift_date];
        if (dayRosters && roster.role) {
          const employee = employees.find(
            (emp) => emp.id === roster.employee_id
          );
          dayRosters[roster.role].push({
            id: roster.id,
            employee_name: employee?.name || `Employee ${roster.employee_id}`,
            shift_start: roster.shift_start,
            shift_end: roster.shift_end,
          });
        }
      });

      // Generate content for each day
      weekDays.forEach((day, dayIndex) => {
        // Check if we need a new page
        if (yPosition > pageHeight - 80) {
          doc.addPage();
          yPosition = 20;
        }

        const req = requirements[day.dayName] || {
          required_chefs: 0,
          required_kitchen_hands: 0,
        };
        const dayRosters = rostersByDay[day.date];

        // Day header
        doc.setFontSize(14);
        doc.setFont("helvetica", "bold");
        doc.text(`${day.dayName} - ${day.date}`, 20, yPosition);
        yPosition += 10;

        // Chef section
        doc.setFontSize(12);
        doc.setFont("helvetica", "bold");
        doc.text(
          `Chef (${dayRosters.Chef.length}/${req.required_chefs})`,
          20,
          yPosition
        );
        yPosition += 8;

        doc.setFont("helvetica", "normal");
        if (dayRosters.Chef.length > 0) {
          dayRosters.Chef.forEach((roster) => {
            doc.text(
              `• ${roster.employee_name} (${String(
                roster.shift_start
              )} - ${String(roster.shift_end)})`,
              30,
              yPosition
            );
            yPosition += 6;
          });
        } else {
          doc.text("• No assignments", 30, yPosition);
          yPosition += 6;
        }

        // Kitchen Hand section
        doc.setFont("helvetica", "bold");
        doc.text(
          `Kitchen Hand (${dayRosters["Kitchen Hand"].length}/${req.required_kitchen_hands})`,
          20,
          yPosition
        );
        yPosition += 8;

        doc.setFont("helvetica", "normal");
        if (dayRosters["Kitchen Hand"].length > 0) {
          dayRosters["Kitchen Hand"].forEach((roster) => {
            doc.text(
              `• ${roster.employee_name} (${String(
                roster.shift_start
              )} - ${String(roster.shift_end)})`,
              30,
              yPosition
            );
            yPosition += 6;
          });
        } else {
          doc.text("• No assignments", 30, yPosition);
          yPosition += 6;
        }

        yPosition += 10; // Space between days
      });

      // Footer
      const footerY = pageHeight - 20;
      doc.setFontSize(8);
      doc.setFont("helvetica", "normal");
      doc.text(
        `Generated on ${new Date().toLocaleString()}`,
        pageWidth / 2,
        footerY,
        { align: "center" }
      );

      // Save the PDF
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
