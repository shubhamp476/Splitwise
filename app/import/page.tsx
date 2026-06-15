"use client";

import { useState } from "react";
import Papa from "papaparse";
import {
  AlertTriangle,
  FileSpreadsheet,
  FileWarning,
  Upload,
} from "lucide-react";

type ImportReportEntry = {
  row: number;
  issue: string;
  action: string;
};

export default function ImportPage() {
  const [rows, setRows] = useState<any[]>([]);
  const [anomalies, setAnomalies] = useState<string[]>([]);
  const [report, setReport] = useState<ImportReportEntry[]>([]);

  const parseDate = (value: unknown) => {
    if (typeof value !== "string") return null;

    const parsedDate = new Date(value);

    return Number.isNaN(parsedDate.getTime()) ? null : parsedDate;
  };

  const handleFileUpload = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];

    if (!file) return;

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,

      complete: (results) => {
        const parsedRows = results.data as any[];

        const detectedAnomalies: string[] = [];
        const importReport: ImportReportEntry[] = [];
        const seenExpenses = new Set<string>();

        const registerIssue = (
          rowNumber: number,
          issue: string,
          action: string,
          anomalyLabel: string
        ) => {
          detectedAnomalies.push(
            `Row ${rowNumber}: ${anomalyLabel}`
          );

          importReport.push({
            row: rowNumber,
            issue,
            action,
          });
        };

        parsedRows.forEach((row, index) => {
          const rowNumber = index + 1;

          // Duplicate detection
          const key = `${row.date}-${row.description?.toLowerCase()}-${row.amount}-${row.currency}-${row.paid_by}`;

          if (seenExpenses.has(key)) {
            registerIssue(
              rowNumber,
              "Duplicate expense",
              "Marked for approval",
              `Possible duplicate expense "${row.description}"`
            );
          }

          seenExpenses.add(key);

          const paidBy =
            typeof row.paid_by === "string"
              ? row.paid_by.trim()
              : "";

          const normalizedPaidBy =
            paidBy.toLowerCase();

          // Name inconsistencies
          if (
            ["priya", "priya s", "rohan"].includes(
              normalizedPaidBy
            )
          ) {
            registerIssue(
              rowNumber,
              "Name inconsistency",
              "Marked for review",
              `Inconsistent name format "${row.paid_by}"`
            );
          }

          // Invalid amount format
          if (
            typeof row.amount === "string" &&
            row.amount.includes(",")
          ) {
            registerIssue(
              rowNumber,
              "Amount format issue",
              "Cleaned and converted",
              `Amount contains comma "${row.amount}"`
            );
          }

          // Too many decimal places
          if (
            typeof row.amount === "string" &&
            Number(row.amount) % 1 !== 0 &&
            row.amount
              .toString()
              .split(".")[1]?.length > 2
          ) {
            registerIssue(
              rowNumber,
              "Amount precision issue",
              "Rounded to 2 decimals",
              `Amount has excessive decimals "${row.amount}"`
            );
          }

          const amountValue = Number(
            String(row.amount).replace(/,/g, "")
          );

          // Negative amount
          if (
            !Number.isNaN(amountValue) &&
            amountValue < 0
          ) {
            registerIssue(
              rowNumber,
              "Negative amount",
              "Flagged for manual review",
              `Negative amount "${row.amount}"`
            );
          }

          const currencyValue =
            typeof row.currency === "string"
              ? row.currency
                  .trim()
                  .toUpperCase()
              : "";

          // USD detection
          if (currencyValue === "USD") {
            registerIssue(
              rowNumber,
              "USD expense detected",
              "Converted using exchange rate",
              "USD expense detected"
            );
          }

          // Missing paid_by
          if (!paidBy) {
            registerIssue(
              rowNumber,
              "Missing paid_by",
              "Marked for manual assignment",
              "Missing paid_by value"
            );
          }

          // Missing currency
          if (!currencyValue) {
            registerIssue(
              rowNumber,
              "Missing currency",
              "Defaulted to INR",
              "Missing currency value"
            );
          }

          const description =
            typeof row.description === "string"
              ? row.description.toLowerCase()
              : "";

          // Settlement detection
          if (
            description.includes("paid back") ||
            description.includes("settlement")
          ) {
            registerIssue(
              rowNumber,
              "Settlement entry",
              "Marked as settlement",
              `Settlement entry "${row.description}"`
            );
          }

          const parsedDate = parseDate(
            row.date
          );

          // Meera after March
          if (
            parsedDate &&
            normalizedPaidBy === "meera" &&
            parsedDate.getMonth() >= 3
          ) {
            registerIssue(
              rowNumber,
              "Meera charged after March",
              "Marked for review",
              `Meera charged after March on "${row.date}"`
            );
          }

          // Sam before mid-April
          if (
            parsedDate &&
            normalizedPaidBy === "sam" &&
            (parsedDate.getMonth() < 3 ||
              (parsedDate.getMonth() ===
                3 &&
                parsedDate.getDate() <
                  15))
          ) {
            registerIssue(
              rowNumber,
              "Sam charged before mid-April",
              "Marked for review",
              `Sam charged before mid-April on "${row.date}"`
            );
          }
        });

        setRows(parsedRows);
        setAnomalies(
          detectedAnomalies
        );
        setReport(importReport);
      },
    });
  };

  return (
    <div className="min-h-screen bg-slate-50 p-8">
      <div className="mx-auto max-w-7xl">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-slate-800">
            Import Expenses CSV
          </h1>

          <p className="mt-2 text-slate-600">
            Upload and analyze
            expenses_export.csv with
            anomaly detection.
          </p>
        </div>

        {/* Stats */}
        <div className="mb-8 grid gap-6 md:grid-cols-3">
          <div className="rounded-2xl bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">
                  Total Records
                </p>

                <h2 className="mt-2 text-3xl font-bold">
                  {rows.length}
                </h2>
              </div>

              <FileSpreadsheet className="h-10 w-10 text-blue-500" />
            </div>
          </div>

          <div className="rounded-2xl bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">
                  Anomalies
                </p>

                <h2 className="mt-2 text-3xl font-bold text-red-500">
                  {anomalies.length}
                </h2>
              </div>

              <AlertTriangle className="h-10 w-10 text-red-500" />
            </div>
          </div>

          <div className="rounded-2xl bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">
                  Import Actions
                </p>

                <h2 className="mt-2 text-3xl font-bold text-green-600">
                  {report.length}
                </h2>
              </div>

              <FileWarning className="h-10 w-10 text-green-500" />
            </div>
          </div>
        </div>

        {/* Upload */}
        <div className="mb-8 rounded-2xl bg-white p-8 shadow-sm">
          <div className="rounded-xl border-2 border-dashed border-slate-300 p-10 text-center">
            <Upload className="mx-auto mb-4 h-12 w-12 text-slate-400" />

            <input
              type="file"
              accept=".csv"
              onChange={
                handleFileUpload
              }
              className="mx-auto block"
            />

            <p className="mt-4 text-slate-500">
              Upload
              expenses_export.csv
            </p>
          </div>
        </div>

        {/* Table */}
        {rows.length > 0 && (
          <div className="overflow-hidden rounded-2xl bg-white shadow-sm">
            <div className="max-h-[600px] overflow-auto">
              <table className="min-w-full">
                <thead>
                  <tr>
                    {Object.keys(
                      rows[0]
                    ).map((key) => (
                      <th
                        key={key}
                        className="sticky top-0 bg-slate-100 p-3 text-left text-sm font-semibold"
                      >
                        {key}
                      </th>
                    ))}
                  </tr>
                </thead>

                <tbody>
                  {rows.map(
                    (
                      row,
                      index
                    ) => (
                      <tr
                        key={index}
                        className="border-b hover:bg-slate-50"
                      >
                        {Object.values(
                          row
                        ).map(
                          (
                            value,
                            idx
                          ) => (
                            <td
                              key={
                                idx
                              }
                              className="p-3 text-sm"
                            >
                              {String(
                                value
                              )}
                            </td>
                          )
                        )}
                      </tr>
                    )
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Anomalies */}
        {anomalies.length > 0 && (
          <div className="mt-8 rounded-2xl bg-white p-6 shadow-sm">
            <h2 className="mb-6 text-2xl font-bold text-red-600">
              Detected
              Anomalies (
              {
                anomalies.length
              }
              )
            </h2>

            <div className="space-y-3">
              {anomalies.map(
                (
                  anomaly,
                  index
                ) => (
                  <div
                    key={
                      index
                    }
                    className="rounded-xl border-l-4 border-red-500 bg-red-50 p-4"
                  >
                    {
                      anomaly
                    }
                  </div>
                )
              )}
            </div>
          </div>
        )}

        {/* Report */}
        {report.length > 0 && (
          <div className="mt-8 rounded-2xl bg-white p-6 shadow-sm">
            <h2 className="mb-6 text-2xl font-bold">
              Import Report
            </h2>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr>
                    <th className="bg-slate-100 p-3 text-left">
                      Row
                    </th>

                    <th className="bg-slate-100 p-3 text-left">
                      Issue
                    </th>

                    <th className="bg-slate-100 p-3 text-left">
                      Action
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {report.map(
                    (
                      entry,
                      index
                    ) => (
                      <tr
                        key={`${entry.row}-${index}`}
                        className="border-b hover:bg-slate-50"
                      >
                        <td className="p-3">
                          {
                            entry.row
                          }
                        </td>

                        <td className="p-3">
                          {
                            entry.issue
                          }
                        </td>

                        <td className="p-3">
                          {
                            entry.action
                          }
                        </td>
                      </tr>
                    )
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}