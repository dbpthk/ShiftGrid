import React from "react";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function Home() {
  const features = [
    "Add and manage employees with per-day availability",
    "Set business requirements with per-person slot times",
    "Build weekly rosters with duplicate prevention",
    "Filter by availability and role automatically",
    "Track total hours per day and week",
    "Export rosters as detailed and table PDFs",
    "Set business closing time per day for accurate hours",
    "Inline editing for employees and requirements",
    "Responsive, modern UI for mobile and desktop",
  ];

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <section className="grid gap-10 lg:grid-cols-2 items-center">
        <div className="space-y-6">
          <div className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white px-3 py-1 text-xs text-gray-600">
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
            Built for growing kitchens
          </div>
          <h1 className="text-4xl font-extrabold tracking-tight text-gray-900 sm:text-5xl">
            Kitchen rosters, without the chaos
          </h1>
          <p className="text-lg leading-7 text-gray-700">
            I built ShiftGrid while managing a growing kitchen—manual
            spreadsheets weren’t keeping up. ShiftGrid makes planning,
            assigning, and tracking shifts fast, flexible, and accurate.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/dashboard"
              className="rounded-md bg-gray-900 px-5 py-3 text-white text-sm font-semibold shadow hover:bg-black focus:outline-none"
            >
              Go to Dashboard
            </Link>
            <Link
              href="/BusinessRequirements"
              className="rounded-md border border-gray-300 px-5 py-3 text-sm font-semibold text-gray-800 hover:bg-gray-50"
            >
              Set Requirements
            </Link>
          </div>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center gap-3">
            <img src="/logo.png" alt="ShiftGrid Logo" className="h-10 w-auto" />
            <span className="text-lg font-semibold text-gray-900">
              ShiftGrid
            </span>
          </div>
          <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {features.map((f) => (
              <li
                key={f}
                className="flex items-start gap-3 rounded-lg border border-gray-200 bg-white p-3 text-sm text-gray-800"
              >
                <span className="mt-1 inline-block h-2.5 w-2.5 rounded-full bg-emerald-500" />
                <span>{f}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>
    </div>
  );
}
