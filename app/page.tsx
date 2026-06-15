import Link from "next/link";
import {
  Users,
  ReceiptIndianRupee,
  Upload,
  ArrowRight,
} from "lucide-react";

export default function Home() {
  const features = [
    {
      title: "Groups",
      description:
        "Create groups and manage changing memberships over time.",
      icon: Users,
      href: "/groups",
      color: "bg-blue-500",
    },
    {
      title: "Expenses",
      description:
        "Track expenses, settlements, and split costs fairly.",
      icon: ReceiptIndianRupee,
      href: "/expenses",
      color: "bg-green-500",
    },
    {
      title: "Import CSV",
      description:
        "Import expenses_export.csv and detect anomalies automatically.",
      icon: Upload,
      href: "/import",
      color: "bg-purple-500",
    },
  ];

  return (
    <main className="min-h-screen bg-slate-50">
      {/* Hero Section */}
      <section className="bg-gradient-to-r from-indigo-600 via-blue-600 to-cyan-500 text-white">
        <div className="max-w-7xl mx-auto px-6 py-20">
          <span className="inline-block rounded-full bg-white/20 px-4 py-1 text-sm font-medium backdrop-blur">
            Spreetail Assignment
          </span>

          <h1 className="mt-6 text-5xl font-bold leading-tight">
            Shared Expenses
            <br />
            Management System
          </h1>

          <p className="mt-6 max-w-2xl text-lg text-blue-100">
            Manage shared expenses, detect anomalies in CSV imports,
            and calculate balances with complete transparency.
          </p>

          <div className="mt-8 flex flex-wrap gap-4">
            <Link
              href="/import"
              className="rounded-lg bg-white px-6 py-3 font-semibold text-blue-600 shadow-lg transition hover:scale-105"
            >
              Import Expenses CSV
            </Link>

            <Link
              href="/groups"
              className="rounded-lg border border-white/30 px-6 py-3 font-semibold backdrop-blur transition hover:bg-white/10"
            >
              View Groups
            </Link>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="max-w-7xl mx-auto px-6 -mt-10">
        <div className="grid gap-6 md:grid-cols-3">
          <div className="rounded-2xl bg-white p-6 shadow-md">
            <p className="text-sm text-slate-500">CSV Records</p>
            <h2 className="mt-2 text-3xl font-bold">43</h2>
          </div>

          <div className="rounded-2xl bg-white p-6 shadow-md">
            <p className="text-sm text-slate-500">
              Anomalies Detected
            </p>
            <h2 className="mt-2 text-3xl font-bold text-red-500">
              12+
            </h2>
          </div>

          <div className="rounded-2xl bg-white p-6 shadow-md">
            <p className="text-sm text-slate-500">
              Active Members
            </p>
            <h2 className="mt-2 text-3xl font-bold">6</h2>
          </div>
        </div>
      </section>

      {/* Feature Cards */}
      <section className="max-w-7xl mx-auto px-6 py-16">
        <div className="mb-10">
          <h2 className="text-3xl font-bold text-slate-800">
            Features
          </h2>
          <p className="mt-2 text-slate-600">
            Everything needed to manage shared expenses.
          </p>
        </div>

        <div className="grid gap-8 md:grid-cols-3">
          {features.map((feature) => {
            const Icon = feature.icon;

            return (
              <Link
                key={feature.title}
                href={feature.href}
                className="group rounded-3xl bg-white p-8 shadow-md transition-all duration-300 hover:-translate-y-2 hover:shadow-xl"
              >
                <div
                  className={`inline-flex rounded-2xl p-4 text-white ${feature.color}`}
                >
                  <Icon size={32} />
                </div>

                <h3 className="mt-6 text-2xl font-bold text-slate-800">
                  {feature.title}
                </h3>

                <p className="mt-3 text-slate-600">
                  {feature.description}
                </p>

                <div className="mt-6 flex items-center gap-2 font-medium text-blue-600">
                  Explore
                  <ArrowRight
                    size={18}
                    className="transition-transform group-hover:translate-x-1"
                  />
                </div>
              </Link>
            );
          })}
        </div>
      </section>
    </main>
  );
}