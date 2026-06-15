import Link from "next/link";
import { getServerSession } from "next-auth/next";
import { authOptions } from "./lib/auth";
import { getUserDashboardBalances } from "./lib/balances";
import {
  Users,
  ReceiptIndianRupee,
  Upload,
  ArrowRight,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Plus,
  ArrowUpRight,
  ChevronRight,
  UserCheck,
} from "lucide-react";

export default async function Home() {
  const session = await getServerSession(authOptions);

  if (!session || !session.user) {
    // ----------------------------------------
    // Public Landing Page (Logged Out View)
    // ----------------------------------------
    const features = [
      {
        title: "Manage Groups",
        description: "Create shared expense groups with roommates, travel partners, or family members.",
        icon: Users,
        href: "/login",
        color: "bg-blue-500",
      },
      {
        title: "Track Expenses & Splits",
        description: "Split costs equally, unequally, by percentage, or by share. Calculate balances instantly.",
        icon: ReceiptIndianRupee,
        href: "/login",
        color: "bg-emerald-500",
      },
      {
        title: "Automated CSV Import",
        description: "Upload your transaction logs, automatically clean data formats, and detect anomalies.",
        icon: Upload,
        href: "/login",
        color: "bg-purple-500",
      },
    ];

    return (
      <main className="flex-1 bg-slate-950 text-white relative overflow-hidden">
        {/* Decorative background gradients */}
        <div className="absolute top-[-10%] left-[-10%] h-[500px] w-[500px] rounded-full bg-indigo-500/10 blur-[100px] pointer-events-none" />
        <div className="absolute bottom-[-10%] right-[-10%] h-[500px] w-[500px] rounded-full bg-cyan-500/10 blur-[100px] pointer-events-none" />

        {/* Hero Section */}
        <section className="mx-auto max-w-7xl px-6 py-24 md:py-32 text-center md:text-left md:flex md:items-center md:justify-between gap-12">
          <div className="max-w-2xl space-y-6">
            <span className="inline-flex items-center gap-2 rounded-full bg-cyan-500/10 border border-cyan-500/30 px-4 py-1 text-sm font-medium text-cyan-400 backdrop-blur">
              ⚡️ Dynamic Expense Splitting
            </span>

            <h1 className="text-4xl sm:text-6xl font-extrabold leading-tight tracking-tight">
              Share Expenses.
              <br />
              <span className="bg-gradient-to-r from-cyan-400 via-blue-500 to-indigo-500 bg-clip-text text-transparent">
                Settle Debts Instantly.
              </span>
            </h1>

            <p className="text-lg text-slate-400 max-w-xl">
              Keep track of shared bills, calculate group balances using debt minimization algorithms, and resolve expenses hassle-free.
            </p>

            <div className="flex flex-wrap justify-center md:justify-start gap-4 pt-4">
              <Link
                href="/login"
                className="rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 px-8 py-4 font-semibold text-white shadow-lg shadow-cyan-500/20 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center gap-2"
              >
                Get Started
                <ArrowRight size={18} />
              </Link>
              <Link
                href="/login"
                className="rounded-xl border border-white/10 bg-white/5 px-8 py-4 font-semibold text-slate-300 hover:bg-white/10 hover:text-white transition-all"
              >
                Sign In
              </Link>
            </div>
          </div>

          <div className="hidden md:block w-full max-w-md bg-white/5 border border-white/10 p-8 rounded-3xl backdrop-blur-md shadow-2xl">
            <h3 className="font-bold text-lg mb-6 text-slate-300 flex items-center gap-2 border-b border-white/5 pb-3">
              📊 Sample Balance Breakdown
            </h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3.5 bg-slate-900/60 rounded-2xl border border-white/5">
                <span className="font-medium">Rohan owes you</span>
                <span className="text-emerald-400 font-bold">₹1,250.00</span>
              </div>
              <div className="flex items-center justify-between p-3.5 bg-slate-900/60 rounded-2xl border border-white/5">
                <span className="font-medium">You owe Aisha</span>
                <span className="text-rose-400 font-bold">₹420.00</span>
              </div>
              <div className="flex items-center justify-between p-3.5 bg-slate-900/60 rounded-2xl border border-white/5">
                <span className="font-medium">Meera owes you</span>
                <span className="text-emerald-400 font-bold">₹800.00</span>
              </div>
            </div>
          </div>
        </section>

        {/* Feature Cards */}
        <section className="mx-auto max-w-7xl px-6 py-16 border-t border-white/5">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-extrabold text-white">Powerful Features</h2>
            <p className="text-slate-400 mt-2">Everything you need for clean and smooth expense splitting</p>
          </div>

          <div className="grid gap-8 md:grid-cols-3">
            {features.map((feature) => {
              const Icon = feature.icon;
              return (
                <Link
                  key={feature.title}
                  href={feature.href}
                  className="group rounded-3xl border border-white/5 bg-white/5 p-8 hover:bg-white/10 hover:border-white/10 transition-all duration-300 shadow-xl"
                >
                  <div className={`inline-flex rounded-2xl p-4 text-white ${feature.color}`}>
                    <Icon size={24} />
                  </div>
                  <h3 className="mt-6 text-xl font-bold text-white group-hover:text-cyan-400 transition-colors">
                    {feature.title}
                  </h3>
                  <p className="mt-3 text-slate-400 text-sm leading-relaxed">
                    {feature.description}
                  </p>
                  <div className="mt-6 flex items-center gap-2 text-sm font-semibold text-cyan-400">
                    Get Started
                    <ArrowRight size={14} className="transition-transform group-hover:translate-x-1" />
                  </div>
                </Link>
              );
            })}
          </div>
        </section>
      </main>
    );
  }

  // ----------------------------------------
  // Private Dashboard (Logged In View)
  // ----------------------------------------
  const { totalOwedToYou, totalYouOwe, netBalance, groupSummaries, peopleBalances } =
    await getUserDashboardBalances((session.user as any).id);

  return (
    <div className="min-h-screen bg-slate-50 p-6 md:p-10 text-slate-900">
      <div className="mx-auto max-w-7xl space-y-8">
        
        {/* Header Title */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl md:text-4xl font-extrabold text-slate-800">
              Welcome, {session.user.name}!
            </h1>
            <p className="text-slate-500 mt-1 text-sm md:text-base">
              Here's your shared expense dashboard summary.
            </p>
          </div>
          <div className="flex gap-3">
            <Link
              href="/groups"
              className="flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white shadow hover:bg-blue-700 hover:scale-[1.02] active:scale-[0.98] transition-all"
            >
              <Plus size={16} />
              Create Group
            </Link>
            <Link
              href="/expenses"
              className="flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white shadow hover:bg-emerald-700 hover:scale-[1.02] active:scale-[0.98] transition-all"
            >
              <ReceiptIndianRupee size={16} />
              Add Expense
            </Link>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid gap-6 sm:grid-cols-3">
          {/* Net Balance */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm flex flex-col justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Net Balance</p>
              <h2
                className={`mt-3 text-3xl font-extrabold ${
                  netBalance > 0.01
                    ? "text-emerald-600"
                    : netBalance < -0.01
                    ? "text-rose-600"
                    : "text-slate-700"
                }`}
              >
                {netBalance > 0 ? "+" : ""}₹{netBalance.toFixed(2)}
              </h2>
            </div>
            <div className="mt-4 flex items-center gap-1.5 text-xs text-slate-500">
              <span className="h-2 w-2 rounded-full bg-slate-400" />
              across all active groups
            </div>
          </div>

          {/* Owed To You */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm flex flex-col justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">You are Owed</p>
              <h2 className="mt-3 text-3xl font-extrabold text-emerald-600">
                ₹{totalOwedToYou.toFixed(2)}
              </h2>
            </div>
            <div className="mt-4 flex items-center gap-1.5 text-xs text-emerald-600">
              <TrendingUp size={14} />
              people owe this to you
            </div>
          </div>

          {/* You Owe */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm flex flex-col justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">You Owe</p>
              <h2 className="mt-3 text-3xl font-extrabold text-rose-600">
                ₹{totalYouOwe.toFixed(2)}
              </h2>
            </div>
            <div className="mt-4 flex items-center gap-1.5 text-xs text-rose-600">
              <TrendingDown size={14} />
              you owe this to others
            </div>
          </div>
        </div>

        {/* Dashboard Sections Layout */}
        <div className="grid gap-8 lg:grid-cols-3">
          {/* Left/Middle: Groups List */}
          <div className="lg:col-span-2 space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                <Users size={20} className="text-blue-500" />
                Your Expense Groups
              </h3>
              <Link href="/groups" className="text-sm font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1">
                View All
                <ChevronRight size={16} />
              </Link>
            </div>

            {groupSummaries.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center">
                <Users className="mx-auto mb-4 h-12 w-12 text-slate-300" />
                <h4 className="text-lg font-semibold text-slate-700">No groups yet</h4>
                <p className="text-sm text-slate-500 mt-1 max-w-sm mx-auto">
                  Create an expense group and invite your friends to start tracking shared expenses together.
                </p>
                <Link
                  href="/groups"
                  className="mt-4 inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"
                >
                  Create Group
                </Link>
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2">
                {groupSummaries.map((group) => (
                  <Link
                    key={group.groupId}
                    href={`/groups/${group.groupId}`}
                    className="group rounded-2xl border border-slate-200 bg-white p-5 hover:shadow-md hover:border-slate-300 transition-all flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <h4 className="font-bold text-lg text-slate-800 group-hover:text-blue-600 transition-colors">
                          {group.name}
                        </h4>
                        <span className="rounded-lg bg-slate-100 px-2 py-1 text-xs text-slate-600 font-medium">
                          {group.memberCount} members
                        </span>
                      </div>
                    </div>

                    <div className="mt-5 flex items-center justify-between border-t border-slate-100 pt-4">
                      <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Group Balance</span>
                      <span
                        className={`text-sm font-bold ${
                          group.net > 0.01
                            ? "text-emerald-600"
                            : group.net < -0.01
                            ? "text-rose-600"
                            : "text-slate-500"
                        }`}
                      >
                        {group.net > 0 ? "You are owed" : group.net < 0 ? "You owe" : "Settled"}
                        <span className="block text-right font-extrabold text-base">
                          {group.net === 0 ? "—" : `₹${Math.abs(group.net).toFixed(2)}`}
                        </span>
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* Right: Individual Balances Breakdown */}
          <div className="space-y-6">
            <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
              <UserCheck size={20} className="text-emerald-500" />
              Balances by Person
            </h3>

            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
              {peopleBalances.length === 0 ? (
                <div className="text-center py-6 text-slate-500">
                  <p className="text-sm">No individual debts found.</p>
                  <p className="text-xs text-slate-400 mt-1">You are completely settled up!</p>
                </div>
              ) : (
                <div className="divide-y divide-slate-100 max-h-[350px] overflow-y-auto pr-1">
                  {peopleBalances.map((person) => (
                    <div
                      key={person.userId}
                      className="flex items-center justify-between py-3.5 first:pt-0 last:pb-0"
                    >
                      <div>
                        <p className="font-bold text-slate-800 text-sm md:text-base">{person.name}</p>
                        <p className="text-xs text-slate-400">{person.email}</p>
                      </div>
                      <div className="text-right">
                        <p
                          className={`text-sm font-bold ${
                            person.amount > 0 ? "text-emerald-600" : "text-rose-600"
                          }`}
                        >
                          {person.amount > 0 ? "owes you" : "you owe"}
                        </p>
                        <p className="font-extrabold text-base text-slate-800">
                          ₹{Math.abs(person.amount).toFixed(2)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}