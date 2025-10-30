"use client";
import React, { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function BusinessHoursCard() {
  const days = [
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
    "Sunday",
  ];
  const [hours, setHours] = useState({}); // values as 'HH:00' or ""
  const [inputs, setInputs] = useState({}); // temporary hour per day
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState({});
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/business-hours")
      .then((r) => r.json())
      .then((res) => {
        if (Array.isArray(res.data)) {
          const m = {};
          const inp = {};
          res.data.forEach((row) => {
            m[row.day_of_week] = row.closing_time;
            inp[row.day_of_week] = row.closing_time
              ? row.closing_time.slice(0, 2)
              : "";
          });
          // Defaults
          days.forEach((d) => {
            if (!inp[d]) inp[d] = "";
          });
          setHours(m);
          setInputs(inp);
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const handleChange = (day, hourValue) => {
    setInputs((prev) => ({ ...prev, [day]: hourValue }));
  };

  const handleSave = async (day) => {
    setSaving((prev) => ({ ...prev, [day]: true }));
    setError("");
    try {
      const val = inputs[day];
      const closing_time = val ? `${val.padStart(2, "0")}:00` : null;
      await fetch("/api/business-hours", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ day_of_week: day, closing_time }),
      });
      setHours((h) => ({ ...h, [day]: closing_time }));
    } catch (e) {
      setError("Failed to save. Try again.");
    } finally {
      setSaving((prev) => ({ ...prev, [day]: false }));
    }
  };

  return (
    <Card className="mb-5">
      <CardHeader>
        <CardTitle className="text-lg">Business Closing Times</CardTitle>
      </CardHeader>
      <CardContent>
        {loading && <div className="text-xs text-gray-400">Loading...</div>}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {days.map((day) => {
            const savedVal = hours[day] ? hours[day].slice(0, 2) : "";
            const currentInput = inputs[day] || "";
            const changed = currentInput && currentInput !== savedVal;
            return (
              <div key={day} className="flex flex-col items-start">
                <span className="font-medium text-gray-700 mb-1 text-xs sm:text-sm">
                  {day}
                </span>
                <select
                  value={currentInput}
                  onChange={(e) => handleChange(day, e.target.value)}
                  className="rounded border border-gray-300 text-xs py-1 px-2"
                  disabled={saving[day]}
                >
                  <option value="">Select hour</option>
                  {Array.from({ length: 24 }).map((_, i) => (
                    <option key={i} value={String(i).padStart(2, "0")}>
                      {String(i).padStart(2, "0") + ":00"}
                    </option>
                  ))}
                </select>
                <button
                  className={`mt-1 text-xs px-2 py-1 rounded ${
                    changed
                      ? "bg-blue-600 text-white"
                      : "bg-gray-200 text-gray-600"
                  }`}
                  disabled={!changed || saving[day]}
                  onClick={() => handleSave(day)}
                  type="button"
                >
                  {saving[day] ? "Saving..." : "Save"}
                </button>
                {hours[day] && (
                  <span className="text-xs mt-1 text-gray-400">
                    Saved: {hours[day]}
                  </span>
                )}
              </div>
            );
          })}
        </div>
        {!!error && <div className="text-xs text-red-600 mt-2">{error}</div>}
      </CardContent>
    </Card>
  );
}
