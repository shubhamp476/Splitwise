export default function Home() {
  return (
    <main className="min-h-screen p-8">
      <h1 className="text-4xl font-bold mb-4">
        Spreetail Shared Expenses App
      </h1>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-lg border p-6">
          <h2 className="text-xl font-semibold">Groups</h2>
          <p>Create and manage expense groups.</p>
        </div>

        <div className="rounded-lg border p-6">
          <h2 className="text-xl font-semibold">Expenses</h2>
          <p>Track shared expenses and settlements.</p>
        </div>

        <div className="rounded-lg border p-6">
          <h2 className="text-xl font-semibold">Import CSV</h2>
          <p>Upload expenses_export.csv and detect anomalies.</p>
        </div>
      </div>
    </main>
  );
}