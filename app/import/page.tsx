"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "react-hot-toast";
import Papa from "papaparse";
import {
  AlertTriangle,
  FileSpreadsheet,
  FileWarning,
  Upload,
  Loader2,
  Database,
  ArrowRight,
} from "lucide-react";

type ImportReportEntry = {
  row: number;
  issue: string;
  action: string;
};

type Group = {
  id: string;
  name: string;
};

export default function ImportPage() {
  const { status } = useSession();
  const router = useRouter();

  // Page States
  const [rows, setRows] = useState<any[]>([]);
  const [anomalies, setAnomalies] = useState<string[]>([]);
  const [report, setReport] = useState<ImportReportEntry[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState("");
  const [importing, setImporting] = useState(false);
  const [loadingGroups, setLoadingGroups] = useState(true);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    }
  }, [status, router]);

  const fetchGroups = async () => {
    try {
      const res = await fetch("/api/groups");
      if (res.ok) {
        const data = await res.json();
        setGroups(data);
        if (data.length > 0) {
          setSelectedGroupId(data[0].id);
        }
      }
    } catch (err) {
      console.error("Failed to load groups:", err);
    } finally {
      setLoadingGroups(false);
    }
  };

  useEffect(() => {
    if (status === "authenticated") {
      fetchGroups();
    }
  }, [status]);

  const parseDate = (value: unknown) => {
    if (typeof value !== "string") return null;
    const parsedDate = new Date(value);
    return Number.isNaN(parsedDate.getTime()) ? null : parsedDate;
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
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
          detectedAnomalies.push(`Row ${rowNumber}: ${anomalyLabel}`);
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

          const paidBy = typeof row.paid_by === "string" ? row.paid_by.trim() : "";
          const normalizedPaidBy = paidBy.toLowerCase();

          // Name inconsistencies
          if (["priya", "priya s", "rohan"].includes(normalizedPaidBy)) {
            registerIssue(
              rowNumber,
              "Name inconsistency",
              "Marked for review",
              `Inconsistent name format "${row.paid_by}"`
            );
          }

          // Invalid amount format
          if (typeof row.amount === "string" && row.amount.includes(",")) {
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
            row.amount.toString().split(".")[1]?.length > 2
          ) {
            registerIssue(
              rowNumber,
              "Amount precision issue",
              "Rounded to 2 decimals",
              `Amount has excessive decimals "${row.amount}"`
            );
          }

          const amountValue = Number(String(row.amount).replace(/,/g, ""));

          // Negative amount
          if (!Number.isNaN(amountValue) && amountValue < 0) {
            registerIssue(
              rowNumber,
              "Negative amount",
              "Flagged for manual review",
              `Negative amount "${row.amount}"`
            );
          }

          const currencyValue = typeof row.currency === "string" ? row.currency.trim().toUpperCase() : "";

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

          const description = typeof row.description === "string" ? row.description.toLowerCase() : "";

          // Settlement detection
          if (description.includes("paid back") || description.includes("settlement")) {
            registerIssue(
              rowNumber,
              "Settlement entry",
              "Marked as settlement",
              `Settlement entry "${row.description}"`
            );
          }

          const parsedDate = parseDate(row.date);

          // Meera after March
          if (parsedDate && normalizedPaidBy === "meera" && parsedDate.getMonth() >= 3) {
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
            (parsedDate.getMonth() < 3 || (parsedDate.getMonth() === 3 && parsedDate.getDate() < 15))
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
        setAnomalies(detectedAnomalies);
        setReport(importReport);
        toast.success(`Parsed ${parsedRows.length} CSV rows successfully!`);
      },
    });
  };

  const handleImportToDatabase = async () => {
    if (!selectedGroupId) {
      toast.error("Please select a group first");
      return;
    }

    if (rows.length === 0) {
      toast.error("Please upload a valid CSV first");
      return;
    }

    setImporting(true);
    try {
      const res = await fetch("/api/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          groupId: selectedGroupId,
          rows,
          anomalies: report, // Pass the report of anomalies to log in database
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || "Failed to import expenses");
      } else {
        toast.success(data.message || "Expenses imported successfully!");
        setRows([]);
        setAnomalies([]);
        setReport([]);
        // Redirect to the selected group detail page
        router.push(`/groups/${selectedGroupId}`);
      }
    } catch (err) {
      toast.error("An error occurred during database import");
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 p-6 md:p-10 text-slate-900">
      <div className="mx-auto max-w-7xl">
        
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl md:text-4xl font-extrabold text-slate-800">
            Import Expenses CSV
          </h1>
          <p className="mt-1.5 text-slate-500 text-sm md:text-base">
            Upload and analyze transaction logs with automated anomaly logs, and sync them to your database.
          </p>
        </div>

        {/* Sync Controls Banner */}
        {rows.length > 0 && (
          <div className="mb-8 rounded-3xl border border-blue-200 bg-blue-50 p-6 shadow-sm flex flex-col md:flex-row md:items-center md:justify-between gap-6">
            <div className="space-y-1">
              <h3 className="font-bold text-lg text-slate-800 flex items-center gap-2">
                <Database size={20} className="text-blue-500" />
                Sync Parsed Rows to Database
              </h3>
              <p className="text-slate-500 text-sm">
                Choose which group to import these parsed expenses into. We will automatically map payer names and log anomalies.
              </p>
            </div>

            {loadingGroups ? (
              <div className="flex items-center gap-2 text-slate-500 text-sm font-semibold">
                <Loader2 className="animate-spin" size={16} />
                Loading groups...
              </div>
            ) : groups.length === 0 ? (
              <div className="text-sm font-bold text-rose-600 flex items-center gap-2">
                ❌ You don't belong to any groups yet.
                <Link href="/groups" className="text-blue-600 underline">
                  Create a group first
                </Link>
              </div>
            ) : (
              <div className="flex flex-col sm:flex-row gap-3">
                <select
                  value={selectedGroupId}
                  onChange={(e) => setSelectedGroupId(e.target.value)}
                  className="rounded-xl border border-slate-200 p-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white min-w-[200px]"
                >
                  {groups.map((group) => (
                    <option key={group.id} value={group.id}>
                      {group.name}
                    </option>
                  ))}
                </select>
                <button
                  onClick={handleImportToDatabase}
                  disabled={importing}
                  className="flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-6 py-3 text-sm font-semibold text-white shadow hover:bg-blue-700 active:scale-[0.98] transition-all disabled:opacity-50"
                >
                  {importing ? (
                    <>
                      <Loader2 className="animate-spin" size={16} />
                      Syncing...
                    </>
                  ) : (
                    <>
                      Import to Group
                      <ArrowRight size={16} />
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        )}

        {/* Stats Grid */}
        <div className="mb-8 grid gap-6 sm:grid-cols-3">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Records</p>
                <h2 className="mt-2 text-3xl font-extrabold text-slate-800">{rows.length}</h2>
              </div>
              <div className="rounded-xl bg-blue-100 p-3 text-blue-600">
                <FileSpreadsheet size={24} />
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Anomalies Detected</p>
                <h2 className={`mt-2 text-3xl font-extrabold ${anomalies.length > 0 ? "text-rose-600" : "text-slate-800"}`}>
                  {anomalies.length}
                </h2>
              </div>
              <div className={`rounded-xl p-3 ${anomalies.length > 0 ? "bg-rose-100 text-rose-600 animate-pulse" : "bg-slate-100 text-slate-400"}`}>
                <AlertTriangle size={24} />
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Import Log Entries</p>
                <h2 className="mt-2 text-3xl font-extrabold text-slate-800">{report.length}</h2>
              </div>
              <div className="rounded-xl bg-amber-100 p-3 text-amber-600">
                <FileWarning size={24} />
              </div>
            </div>
          </div>
        </div>

        {/* Upload Container */}
        <div className="mb-8 rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
          <div className="rounded-2xl border-2 border-dashed border-slate-300 p-10 text-center relative hover:bg-slate-50 transition-colors">
            <Upload className="mx-auto mb-4 h-12 w-12 text-slate-400" />
            <input
              type="file"
              accept=".csv"
              onChange={handleFileUpload}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            />
            <p className="text-sm font-bold text-slate-700">Click or drag your CSV file here to upload</p>
            <p className="mt-1.5 text-xs text-slate-400">Supports standard expenses_export.csv uploads</p>
          </div>
        </div>

        {/* Two-Column Details Output: Table & Anomalies List */}
        {rows.length > 0 && (
          <div className="grid gap-8 lg:grid-cols-3">
            
            {/* Table: Left Column */}
            <div className="lg:col-span-2 space-y-4">
              <h3 className="text-lg font-bold text-slate-800">CSV Raw Data Preview</h3>
              <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                <div className="max-h-[500px] overflow-auto">
                  <table className="min-w-full text-left text-sm text-slate-700">
                    <thead>
                      <tr className="sticky top-0 bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-400 uppercase tracking-wider">
                        {Object.keys(rows[0]).map((key) => (
                          <th key={key} className="p-3 bg-slate-50">
                            {key}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {rows.map((row, index) => (
                        <tr key={index} className="hover:bg-slate-50 transition-colors">
                          {Object.values(row).map((value, idx) => (
                            <td key={idx} className="p-3 text-xs md:text-sm font-medium">
                              {String(value)}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Audit Logs: Right Column */}
            <div className="space-y-6">
              
              {/* Anomalies List */}
              <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
                <h3 className="text-lg font-bold text-slate-800 flex items-center gap-1.5">
                  <AlertTriangle size={18} className="text-rose-500" />
                  Detected Anomalies
                </h3>
                
                {anomalies.length === 0 ? (
                  <p className="text-sm text-slate-400 py-4 text-center">No format anomalies detected.</p>
                ) : (
                  <div className="space-y-2.5 max-h-[300px] overflow-y-auto pr-1">
                    {anomalies.map((anomaly, idx) => (
                      <div
                        key={idx}
                        className="rounded-xl border-l-4 border-rose-500 bg-rose-50 p-3 text-xs text-rose-800 font-semibold"
                      >
                        {anomaly}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Import Logs Table */}
              <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
                <h3 className="text-lg font-bold text-slate-800 flex items-center gap-1.5">
                  <FileWarning size={18} className="text-amber-500" />
                  Import Audit Actions
                </h3>

                {report.length === 0 ? (
                  <p className="text-sm text-slate-400 py-4 text-center">No data correction required.</p>
                ) : (
                  <div className="overflow-hidden border border-slate-100 rounded-xl">
                    <div className="max-h-[250px] overflow-y-auto pr-0.5">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead>
                          <tr className="bg-slate-50 border-b border-slate-200 text-slate-400 font-bold uppercase tracking-wider">
                            <th className="p-2.5 pl-4">Row</th>
                            <th className="p-2.5">Issue</th>
                            <th className="p-2.5 pr-4 text-right">Action</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 font-medium">
                          {report.map((entry, idx) => (
                            <tr key={idx} className="hover:bg-slate-50 transition-colors">
                              <td className="p-2.5 pl-4 text-slate-500">#{entry.row}</td>
                              <td className="p-2.5 text-slate-700">{entry.issue}</td>
                              <td className="p-2.5 pr-4 text-right text-emerald-600 font-bold">{entry.action}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>

            </div>

          </div>
        )}

      </div>
    </div>
  );
}