"use client";

import { useState } from "react";
import Papa from "papaparse";

export default function ImportPage() {
  const [rows, setRows] = useState<any[]>([]);
  const [anomalies, setAnomalies] = useState<string[]>([]);

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];

    if (!file) return;

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const parsedRows = results.data as any[];

        const anomalies: string[] = [];
        const seenExpenses = new Set();

        parsedRows.forEach((row, index) => {
          // Duplicate detection
          const key = `${row.date}-${row.description?.toLowerCase()}-${row.amount}`;

          if (seenExpenses.has(key)) {
            anomalies.push(
              `Row ${index + 1}: Possible duplicate expense "${row.description}"`,
            );
          }

          seenExpenses.add(key);

          // Name inconsistencies
          if (
            row.paid_by &&
            ["priya", "Priya S", "rohan"].includes(row.paid_by)
          ) {
            anomalies.push(
              `Row ${index + 1}: Inconsistent name format "${row.paid_by}"`,
            );
          }

          // Invalid amount format
          if (typeof row.amount === "string" && row.amount.includes(",")) {
            anomalies.push(
              `Row ${index + 1}: Amount contains comma "${row.amount}"`,
            );
          }

          // Too many decimal places
          if (
            Number(row.amount) % 1 !== 0 &&
            row.amount.toString().split(".")[1]?.length > 2
          ) {
            anomalies.push(
              `Row ${index + 1}: Amount has excessive decimals "${row.amount}"`,
            );
          }
        });

        console.log(anomalies);

        setRows(parsedRows);
        setAnomalies(anomalies);

        alert(
          `${anomalies.length} anomalies detected.\nCheck console for details.`,
        );
      },
    });
  };

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold mb-6">Import Expenses CSV</h1>

      <input
        type="file"
        accept=".csv"
        onChange={handleFileUpload}
        className="mb-6"
      />

      <p className="mb-4 font-medium">Total Records: {rows.length}</p>

      <div className="max-h-[70vh] overflow-auto rounded border">
        <table className="border-collapse border w-full">
          <thead>
            <tr>
              {rows.length > 0 &&
                Object.keys(rows[0]).map((key) => (
                  <th key={key} className="border p-2">
                    {key}
                  </th>
                ))}
            </tr>
          </thead>

          <tbody>
            {rows.map((row, index) => (
              <tr key={index}>
                {Object.values(row).map((value, idx) => (
                  <td key={idx} className="border p-2">
                    {String(value)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {anomalies.length > 0 && (
        <div className="mt-6 rounded border p-4">
          <h2 className="mb-3 text-xl font-semibold">Detected Anomalies</h2>
          <ul className="list-disc space-y-1 pl-6">
            {anomalies.map((anomaly, index) => (
              <li key={index}>{anomaly}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
