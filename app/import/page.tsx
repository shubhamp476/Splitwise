"use client";

import { useState } from "react";
import Papa from "papaparse";

export default function ImportPage() {
  const [rows, setRows] = useState<any[]>([]);

  const handleFileUpload = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];

    if (!file) return;

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        console.log(results.data);
        setRows(results.data as any[]);
      },
    });
  };

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold mb-6">
        Import Expenses CSV
      </h1>

      <input
        type="file"
        accept=".csv"
        onChange={handleFileUpload}
        className="mb-6"
      />

      <div className="overflow-x-auto">
        <table className="border-collapse border w-full">
          <thead>
            <tr>
              {rows.length > 0 &&
                Object.keys(rows[0]).map((key) => (
                  <th
                    key={key}
                    className="border p-2"
                  >
                    {key}
                  </th>
                ))}
            </tr>
          </thead>

          <tbody>
            {rows.slice(0, 10).map((row, index) => (
              <tr key={index}>
                {Object.values(row).map((value, idx) => (
                  <td
                    key={idx}
                    className="border p-2"
                  >
                    {String(value)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}