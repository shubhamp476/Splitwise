"use client";

import { use, useEffect, useState, useRef } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "react-hot-toast";
import {
  ArrowLeft,
  Plus,
  Users,
  Trash2,
  ReceiptIndianRupee,
  MessageSquare,
  TrendingUp,
  TrendingDown,
  Info,
  Calendar,
  DollarSign,
  UserPlus,
  Send,
  Loader2,
  CheckCircle,
} from "lucide-react";

// Types
type User = {
  id: string;
  name: string;
  email: string;
};

type ExpenseSplit = {
  id: string;
  userId: string;
  amount: number;
  user: User;
};

type Expense = {
  id: string;
  description: string;
  amount: number;
  currency: string;
  splitType: string;
  expenseDate: string;
  paidBy: User;
  splits: ExpenseSplit[];
  isSettlement: boolean;
};

type GroupBalance = {
  userId: string;
  name: string;
  email: string;
  paid: number;
  owed: number;
  net: number;
};

type Transaction = {
  fromId: string;
  fromName: string;
  toId: string;
  toName: string;
  amount: number;
};

type Message = {
  id: string;
  content: string;
  createdAt: string;
  user: User;
};

export default function GroupDetailPage({
  params: paramsPromise,
}: {
  params: Promise<{ id: string }>;
}) {
  const params = use(paramsPromise);
  const groupId = params.id;
  
  const { data: session, status } = useSession();
  const router = useRouter();

  // Component States
  const [group, setGroup] = useState<{ id: string; name: string } | null>(null);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [balances, setBalances] = useState<GroupBalance[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"expenses" | "balances">("expenses");

  // Modals
  const [showMemberModal, setShowMemberModal] = useState(false);
  const [showSettleModal, setShowSettleModal] = useState(false);
  const [showExpenseModal, setShowExpenseModal] = useState(false);

  // Modal Form States
  const [memberEmail, setMemberEmail] = useState("");
  const [settlePayer, setSettlePayer] = useState("");
  const [settleReceiver, setSettleReceiver] = useState("");
  const [settleAmount, setSettleAmount] = useState("");

  const [expenseDesc, setExpenseDesc] = useState("");
  const [expenseAmount, setExpenseAmount] = useState("");
  const [expenseCurrency, setExpenseCurrency] = useState("INR");
  const [expenseSplitType, setExpenseSplitType] = useState<"EQUAL" | "EXACT" | "PERCENTAGE" | "SHARE">("EQUAL");
  const [expensePayer, setExpensePayer] = useState("");
  const [individualSplits, setIndividualSplits] = useState<Record<string, string>>({}); // userId -> value

  // Drawer for Expense Details & Chat
  const [selectedExpense, setSelectedExpense] = useState<Expense | null>(null);
  const [chatMessages, setChatMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const pollingTimer = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    }
  }, [status, router]);

  const fetchGroupDetails = async () => {
    try {
      const res = await fetch(`/api/groups/${groupId}`);
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Failed to load group details");
      }
      const data = await res.json();
      setGroup(data.group);
      setExpenses(data.expenses);
      setBalances(data.balances);
      setTransactions(data.transactions);
    } catch (err: any) {
      toast.error(err.message || "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (status === "authenticated") {
      fetchGroupDetails();
    }
  }, [status, groupId]);

  // Polling for Chat Messages when drawer is open
  useEffect(() => {
    if (selectedExpense) {
      fetchChatMessages(selectedExpense.id);
      pollingTimer.current = setInterval(() => {
        fetchChatMessages(selectedExpense.id, true);
      }, 3000);
    } else {
      if (pollingTimer.current) {
        clearInterval(pollingTimer.current);
      }
    }
    return () => {
      if (pollingTimer.current) {
        clearInterval(pollingTimer.current);
      }
    };
  }, [selectedExpense]);

  // Scroll to bottom of chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages]);

  const fetchChatMessages = async (expenseId: string, isPoll = false) => {
    try {
      const res = await fetch(`/api/expenses/${expenseId}/chat`);
      if (res.ok) {
        const data = await res.json();
        setChatMessages(data);
      }
    } catch (err) {
      if (!isPoll) {
        console.error("Failed to load chat messages:", err);
      }
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedExpense) return;

    const messageContent = newMessage.trim();
    setNewMessage("");

    try {
      const res = await fetch(`/api/expenses/${selectedExpense.id}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: messageContent }),
      });

      if (res.ok) {
        const msg = await res.json();
        setChatMessages((prev) => [...prev, msg]);
      } else {
        toast.error("Failed to send message");
      }
    } catch (err) {
      toast.error("Network error");
    }
  };

  // Group Member Operations
  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!memberEmail.trim()) return;

    try {
      const res = await fetch(`/api/groups/${groupId}/members`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: memberEmail }),
      });
      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || "Failed to add member");
      } else {
        toast.success(data.message || "Member added!");
        setMemberEmail("");
        setShowMemberModal(false);
        fetchGroupDetails();
      }
    } catch (err) {
      toast.error("An error occurred");
    }
  };

  const handleRemoveMember = async (userId: string) => {
    if (!confirm("Are you sure you want to remove this member?")) return;

    try {
      const res = await fetch(`/api/groups/${groupId}/members`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      });
      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || "Failed to remove member");
      } else {
        toast.success(data.message || "Member removed!");
        fetchGroupDetails();
      }
    } catch (err) {
      toast.error("An error occurred");
    }
  };

  // Settlement Recording
  const handleRecordSettlement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!settlePayer || !settleReceiver || !settleAmount || parseFloat(settleAmount) <= 0) {
      toast.error("Please fill in all fields correctly");
      return;
    }

    try {
      const res = await fetch(`/api/groups/${groupId}/settle`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fromId: settlePayer,
          toId: settleReceiver,
          amount: parseFloat(settleAmount),
          currency: "INR",
        }),
      });
      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || "Failed to record payment");
      } else {
        toast.success(data.message || "Payment recorded!");
        setSettlePayer("");
        setSettleReceiver("");
        setSettleAmount("");
        setShowSettleModal(false);
        fetchGroupDetails();
      }
    } catch (err) {
      toast.error("An error occurred");
    }
  };

  // Expense Recording Helper
  const handleAddExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!expenseDesc.trim() || !expenseAmount || !expensePayer) {
      toast.error("Please fill in all required fields");
      return;
    }

    const total = parseFloat(expenseAmount);
    if (isNaN(total) || total <= 0) {
      toast.error("Amount must be a positive number");
      return;
    }

    // Prepare splits based on split type
    const splits: { userId: string; value: number }[] = [];

    if (expenseSplitType === "EQUAL") {
      const share = total / balances.length;
      balances.forEach((member) => {
        splits.push({ userId: member.userId, value: share });
      });
    } else if (expenseSplitType === "EXACT") {
      let sum = 0;
      for (const member of balances) {
        const val = parseFloat(individualSplits[member.userId] || "0");
        if (isNaN(val) || val < 0) {
          toast.error("Split values must be positive numbers");
          return;
        }
        sum += val;
        splits.push({ userId: member.userId, value: val });
      }

      if (Math.abs(sum - total) > 0.02) {
        toast.error(`Total of splits (₹${sum.toFixed(2)}) must match the expense amount (₹${total.toFixed(2)})`);
        return;
      }
    } else if (expenseSplitType === "PERCENTAGE") {
      let sum = 0;
      for (const member of balances) {
        const pct = parseFloat(individualSplits[member.userId] || "0");
        if (isNaN(pct) || pct < 0) {
          toast.error("Percentage values must be positive");
          return;
        }
        sum += pct;
        splits.push({ userId: member.userId, value: (pct / 100) * total });
      }

      if (Math.abs(sum - 100) > 0.05) {
        toast.error("Total percentage splits must equal 100%");
        return;
      }
    } else if (expenseSplitType === "SHARE") {
      let totalShares = 0;
      const shares: Record<string, number> = {};

      for (const member of balances) {
        const sh = parseFloat(individualSplits[member.userId] || "0");
        if (isNaN(sh) || sh < 0) {
          toast.error("Share units must be positive");
          return;
        }
        totalShares += sh;
        shares[member.userId] = sh;
      }

      if (totalShares <= 0) {
        toast.error("Total shares must be greater than 0");
        return;
      }

      balances.forEach((member) => {
        const userShare = shares[member.userId] || 0;
        splits.push({ userId: member.userId, value: (userShare / totalShares) * total });
      });
    }

    try {
      const res = await fetch(`/api/expenses`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          description: expenseDesc.trim(),
          amount: total,
          currency: expenseCurrency,
          splitType: expenseSplitType,
          groupId,
          paidById: expensePayer,
          splits,
        }),
      });
      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || "Failed to create expense");
      } else {
        toast.success("Expense added successfully!");
        // Reset form
        setExpenseDesc("");
        setExpenseAmount("");
        setExpenseSplitType("EQUAL");
        setIndividualSplits({});
        setShowExpenseModal(false);
        fetchGroupDetails();
      }
    } catch (err) {
      toast.error("An error occurred");
    }
  };

  const getPayerName = (id: string) => {
    return balances.find((b) => b.userId === id)?.name || "Unknown";
  };

  if (loading) {
    return (
      <div className="flex h-[70vh] flex-col items-center justify-center gap-3">
        <Loader2 className="animate-spin text-blue-500 h-10 w-10" />
        <p className="text-slate-500 text-sm font-medium">Loading group details...</p>
      </div>
    );
  }

  if (!group) {
    return (
      <div className="text-center py-20">
        <h2 className="text-2xl font-bold">Group not found</h2>
        <p className="text-slate-500 mt-2">The group you are trying to access doesn't exist or you don't have access.</p>
        <Link href="/" className="mt-4 inline-block text-blue-600 font-semibold hover:underline">
          Back to Dashboard
        </Link>
      </div>
    );
  }

  const currentUserId = session?.user ? (session.user as any).id : null;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-16">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
        
        {/* Breadcrumb Navigation */}
        <div className="mb-6">
          <Link href="/" className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-500 hover:text-slate-800 transition-colors">
            <ArrowLeft size={16} />
            Back to Dashboard
          </Link>
        </div>

        {/* Group Header */}
        <div className="mb-8 flex flex-col md:flex-row md:items-center md:justify-between gap-6 bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="rounded-2xl bg-blue-100 p-4 text-blue-600">
              <Users size={32} />
            </div>
            <div>
              <h1 className="text-3xl font-extrabold text-slate-800">{group.name}</h1>
              <p className="text-slate-500 mt-1 text-sm">
                Shared expense group &bull; {balances.length} active members
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2.5">
            <button
              onClick={() => {
                setExpensePayer(currentUserId || "");
                setShowExpenseModal(true);
              }}
              className="flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white shadow hover:bg-emerald-700 active:scale-[0.98] transition-all"
            >
              <Plus size={16} />
              Add Expense
            </button>
            <button
              onClick={() => {
                // Pre-select first two members if available
                if (balances.length >= 2) {
                  setSettlePayer(balances[0].userId);
                  setSettleReceiver(balances[1].userId);
                }
                setShowSettleModal(true);
              }}
              className="flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white shadow hover:bg-blue-700 active:scale-[0.98] transition-all"
            >
              <CheckCircle size={16} />
              Settle Up
            </button>
            <button
              onClick={() => setShowMemberModal(true)}
              className="flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm font-semibold hover:bg-slate-50 active:scale-[0.98] transition-all"
            >
              <UserPlus size={16} className="text-slate-500" />
              Invite Member
            </button>
          </div>
        </div>

        {/* Grid Layout */}
        <div className="grid gap-8 lg:grid-cols-3">
          
          {/* Left Column: Members & Debt Simplification */}
          <div className="space-y-6">
            
            {/* Members Section */}
            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                <Users size={18} className="text-slate-500" />
                Group Members
              </h3>
              
              <div className="space-y-3.5 divide-y divide-slate-100">
                {balances.map((member) => (
                  <div key={member.userId} className="flex items-center justify-between pt-3.5 first:pt-0">
                    <div>
                      <p className="font-bold text-slate-800 text-sm">{member.name}</p>
                      <p className="text-xs text-slate-400">{member.email}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <span
                          className={`text-xs font-bold ${
                            member.net > 0.01
                              ? "text-emerald-600"
                              : member.net < -0.01
                              ? "text-rose-600"
                              : "text-slate-400"
                          }`}
                        >
                          {member.net > 0.01
                            ? `gets back ₹${member.net.toFixed(2)}`
                            : member.net < -0.01
                            ? `owes ₹${Math.abs(member.net).toFixed(2)}`
                            : "settled"}
                        </span>
                      </div>
                      {/* Only show remove option if not the creator user */}
                      {member.userId !== currentUserId && (
                        <button
                          onClick={() => handleRemoveMember(member.userId)}
                          className="rounded-lg p-1 text-slate-400 hover:bg-red-50 hover:text-red-500 transition-all"
                          title="Remove member"
                        >
                          <Trash2 size={16} />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Debt Minimization (Simplified Debts) Section */}
            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                <TrendingUp size={18} className="text-blue-500" />
                Simplified Debts
              </h3>
              
              {transactions.length === 0 ? (
                <div className="text-center py-6 text-slate-500">
                  <p className="text-sm font-medium">All debts are cleared!</p>
                  <p className="text-xs text-slate-400 mt-1">Excellent financial management!</p>
                </div>
              ) : (
                <div className="space-y-3.5">
                  {transactions.map((tx, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between p-3.5 bg-slate-50 rounded-2xl border border-slate-200/60"
                    >
                      <div className="text-sm">
                        <span className="font-bold text-slate-800">{tx.fromName}</span>
                        <span className="text-slate-500"> owes </span>
                        <span className="font-bold text-slate-800">{tx.toName}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="font-extrabold text-slate-800 text-sm">₹{tx.amount.toFixed(2)}</span>
                        {/* Show settle up shortcut button if current user is debtor or creditor */}
                        {(tx.fromId === currentUserId || tx.toId === currentUserId) && (
                          <button
                            onClick={() => {
                              setSettlePayer(tx.fromId);
                              setSettleReceiver(tx.toId);
                              setSettleAmount(tx.amount.toString());
                              setShowSettleModal(true);
                            }}
                            className="rounded-lg bg-blue-100 px-2.5 py-1 text-xs font-bold text-blue-600 hover:bg-blue-200 transition-all"
                          >
                            Settle
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>

          {/* Right Column: Expenses List & Tabs */}
          <div className="lg:col-span-2 space-y-6">
            
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                <ReceiptIndianRupee size={20} className="text-emerald-500" />
                Expenses History
              </h3>
            </div>

            {expenses.length === 0 ? (
              <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-16 text-center">
                <ReceiptIndianRupee className="mx-auto mb-4 h-14 w-14 text-slate-300" />
                <h4 className="text-xl font-bold text-slate-700">No Expenses Recorded</h4>
                <p className="text-sm text-slate-500 mt-2 max-w-sm mx-auto">
                  Keep track of utilities, groceries, or travel split costs by adding your first expense to this group.
                </p>
                <button
                  onClick={() => {
                    setExpensePayer(currentUserId || "");
                    setShowExpenseModal(true);
                  }}
                  className="mt-6 rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white shadow hover:bg-emerald-700"
                >
                  Add First Expense
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {expenses.map((expense) => (
                  <div
                    key={expense.id}
                    onClick={() => {
                      setSelectedExpense(expense);
                      setChatMessages([]); // Reset chat logs during fetch
                    }}
                    className={`group rounded-2xl border bg-white p-5 hover:shadow-md hover:border-slate-300 transition-all cursor-pointer flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 ${
                      expense.isSettlement ? "border-slate-100 bg-slate-50/50 opacity-90" : "border-slate-200"
                    }`}
                  >
                    <div className="flex items-center gap-3.5">
                      <div
                        className={`rounded-xl p-3 ${
                          expense.isSettlement ? "bg-slate-200 text-slate-600" : "bg-emerald-100 text-emerald-600"
                        }`}
                      >
                        <ReceiptIndianRupee size={20} />
                      </div>
                      <div>
                        <h4 className="font-bold text-slate-800 group-hover:text-blue-600 transition-colors text-sm md:text-base">
                          {expense.description}
                        </h4>
                        <p className="text-xs text-slate-400 mt-1 flex items-center gap-1.5">
                          <span>Paid by {expense.paidBy.name}</span>
                          <span>&bull;</span>
                          <Calendar size={12} />
                          <span>{new Date(expense.expenseDate).toLocaleDateString()}</span>
                          {expense.isSettlement && (
                            <span className="rounded bg-slate-200 px-1.5 py-0.5 text-[10px] font-bold text-slate-700">
                              Settlement
                            </span>
                          )}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-6 border-t sm:border-t-0 border-slate-100 pt-3 sm:pt-0">
                      <div className="text-left sm:text-right">
                        <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Amount</p>
                        <p className="font-extrabold text-slate-800 text-base md:text-lg">
                          ₹{expense.amount.toFixed(2)}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 text-slate-400 group-hover:text-blue-500 transition-colors text-xs font-semibold">
                        <MessageSquare size={16} />
                        Discuss
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>

      </div>

      {/* ----------------------------------------
          MODALS & DRAWERS
         ---------------------------------------- */}

      {/* Modal: Invite Member */}
      {showMemberModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-3xl bg-white p-8 border border-slate-100 shadow-2xl">
            <h2 className="mb-6 text-2xl font-bold text-slate-800">Invite Group Member</h2>
            <form onSubmit={handleAddMember} className="space-y-4">
              <div>
                <label className="mb-2 block text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Member's Email Address
                </label>
                <input
                  type="email"
                  required
                  value={memberEmail}
                  onChange={(e) => setMemberEmail(e.target.value)}
                  placeholder="name@example.com"
                  className="w-full rounded-xl border border-slate-200 p-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <p className="mt-2 text-xs text-slate-400">
                  If the invited user is not registered on Spreetail, we will automatically set up a placeholder account. They can login with password <span className="font-semibold text-slate-600">password123</span>.
                </p>
              </div>
              <div className="mt-8 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowMemberModal(false)}
                  className="rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-semibold hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 shadow"
                >
                  Invite
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Settle Up Payment */}
      {showSettleModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-3xl bg-white p-8 border border-slate-100 shadow-2xl">
            <h2 className="mb-6 text-2xl font-bold text-slate-800">Record Settlement</h2>
            <form onSubmit={handleRecordSettlement} className="space-y-5">
              
              {/* Payer selection */}
              <div>
                <label className="mb-1.5 block text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Who Paid?
                </label>
                <select
                  value={settlePayer}
                  onChange={(e) => setSettlePayer(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 p-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                >
                  {balances.map((member) => (
                    <option key={member.userId} value={member.userId}>
                      {member.name} ({member.email})
                    </option>
                  ))}
                </select>
              </div>

              {/* Receiver selection */}
              <div>
                <label className="mb-1.5 block text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Who Received?
                </label>
                <select
                  value={settleReceiver}
                  onChange={(e) => setSettleReceiver(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 p-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                >
                  {balances.map((member) => (
                    <option key={member.userId} value={member.userId} disabled={member.userId === settlePayer}>
                      {member.name} ({member.email})
                    </option>
                  ))}
                </select>
              </div>

              {/* Amount input */}
              <div>
                <label className="mb-1.5 block text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Payment Amount (INR)
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none text-slate-400 font-bold">
                    ₹
                  </div>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    required
                    value={settleAmount}
                    onChange={(e) => setSettleAmount(e.target.value)}
                    placeholder="250.00"
                    className="block w-full pl-8 pr-4 py-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="mt-8 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowSettleModal(false)}
                  className="rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-semibold hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 shadow"
                >
                  Record Payment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Add Expense */}
      {showExpenseModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm overflow-y-auto">
          <div className="w-full max-w-lg rounded-3xl bg-white p-8 border border-slate-100 shadow-2xl my-8">
            <h2 className="mb-6 text-2xl font-bold text-slate-800">Add Shared Expense</h2>
            
            <form onSubmit={handleAddExpense} className="space-y-5">
              
              {/* Description */}
              <div>
                <label className="mb-1.5 block text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Description
                </label>
                <input
                  type="text"
                  required
                  value={expenseDesc}
                  onChange={(e) => setExpenseDesc(e.target.value)}
                  placeholder="Utilities bill / Dinner / Cabs"
                  className="w-full rounded-xl border border-slate-200 p-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              {/* Amount & Currency */}
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2">
                  <label className="mb-1.5 block text-xs font-bold text-slate-500 uppercase tracking-wider">
                    Amount
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none text-slate-400 font-bold">
                      {expenseCurrency === "INR" ? "₹" : "$"}
                    </div>
                    <input
                      type="number"
                      step="0.01"
                      min="0.01"
                      required
                      value={expenseAmount}
                      onChange={(e) => setExpenseAmount(e.target.value)}
                      placeholder="1200.00"
                      className="block w-full pl-8 pr-4 py-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-bold text-slate-500 uppercase tracking-wider">
                    Currency
                  </label>
                  <select
                    value={expenseCurrency}
                    onChange={(e) => setExpenseCurrency(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 p-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
                  >
                    <option value="INR">INR (₹)</option>
                    <option value="USD">USD ($)</option>
                  </select>
                </div>
              </div>

              {/* Paid By */}
              <div>
                <label className="mb-1.5 block text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Who Paid?
                </label>
                <select
                  value={expensePayer}
                  onChange={(e) => setExpensePayer(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 p-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
                >
                  {balances.map((member) => (
                    <option key={member.userId} value={member.userId}>
                      {member.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Split Type */}
              <div>
                <label className="mb-1.5 block text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Split Options
                </label>
                <div className="grid grid-cols-4 rounded-xl bg-slate-100 p-1 border border-slate-200">
                  {(["EQUAL", "EXACT", "PERCENTAGE", "SHARE"] as const).map((type) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => {
                        setExpenseSplitType(type);
                        setIndividualSplits({}); // reset inputs
                      }}
                      className={`rounded-lg py-1.5 text-xs font-semibold transition-all ${
                        expenseSplitType === type
                          ? "bg-emerald-600 text-white shadow-sm"
                          : "text-slate-500 hover:text-slate-800"
                      }`}
                    >
                      {type}
                    </button>
                  ))}
                </div>
              </div>

              {/* Conditional Inputs based on Split Options */}
              {expenseSplitType !== "EQUAL" && (
                <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4 space-y-3">
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                    {expenseSplitType === "EXACT" && "Specify amounts (sum must equal total)"}
                    {expenseSplitType === "PERCENTAGE" && "Specify percentages (sum must equal 100%)"}
                    {expenseSplitType === "SHARE" && "Specify share units (e.g. Aisha: 2, Rohan: 1)"}
                  </p>
                  
                  {balances.map((member) => (
                    <div key={member.userId} className="flex items-center justify-between">
                      <span className="text-sm font-semibold text-slate-700">{member.name}</span>
                      <div className="relative w-32">
                        {expenseSplitType === "EXACT" && (
                          <div className="absolute inset-y-0 left-0 flex items-center pl-2.5 pointer-events-none text-slate-400 text-xs font-bold">
                            ₹
                          </div>
                        )}
                        <input
                          type="number"
                          step="any"
                          required
                          value={individualSplits[member.userId] || ""}
                          onChange={(e) =>
                            setIndividualSplits((prev) => ({
                              ...prev,
                              [member.userId]: e.target.value,
                            }))
                          }
                          placeholder={
                            expenseSplitType === "EXACT" ? "0.00" : expenseSplitType === "PERCENTAGE" ? "0%" : "0 shares"
                          }
                          className={`block w-full pr-2.5 py-1.5 rounded-lg border border-slate-200 text-sm text-right focus:outline-none focus:ring-1 focus:ring-emerald-500 ${
                            expenseSplitType === "EXACT" ? "pl-6" : "pl-2"
                          }`}
                        />
                        {expenseSplitType === "PERCENTAGE" && (
                          <div className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none text-slate-400 text-xs font-bold">
                            %
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="mt-8 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowExpenseModal(false)}
                  className="rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-semibold hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 shadow"
                >
                  Add Expense
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Drawer: Expense Details & Chat Panel */}
      {selectedExpense && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-sm">
          {/* Backdrop Click */}
          <div className="flex-grow" onClick={() => setSelectedExpense(null)} />

          {/* Drawer Body */}
          <div className="w-full max-w-lg bg-white h-full flex flex-col shadow-2xl relative animate-in slide-in-from-right duration-300">
            {/* Header */}
            <div className="p-6 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h3 className="font-extrabold text-lg text-slate-800">{selectedExpense.description}</h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Paid by {selectedExpense.paidBy.name} on{" "}
                  {new Date(selectedExpense.expenseDate).toLocaleDateString()}
                </p>
              </div>
              <button
                onClick={() => setSelectedExpense(null)}
                className="rounded-xl border border-slate-200 p-2 text-slate-400 hover:bg-slate-50 hover:text-slate-800 transition-all text-xs font-bold"
              >
                Close
              </button>
            </div>

            {/* Content Container (Split Detail + Message Box) */}
            <div className="flex-grow overflow-y-auto p-6 space-y-6">
              
              {/* Splits List */}
              <div className="rounded-2xl bg-slate-50 p-4 border border-slate-200/50">
                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">
                  Expense Splits breakdown
                </h4>
                
                <div className="space-y-2.5">
                  {selectedExpense.splits.map((split) => (
                    <div key={split.id} className="flex items-center justify-between text-sm">
                      <span className="font-medium text-slate-700">{split.user.name}</span>
                      <span className="font-bold text-slate-800">₹{split.amount.toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Real-time Discuss Chat section */}
              <div className="space-y-4">
                <h4 className="text-sm font-extrabold text-slate-800 flex items-center gap-1.5">
                  <MessageSquare size={16} className="text-blue-500" />
                  Real-time Discussion
                </h4>

                {/* Messages Feed */}
                <div className="h-[250px] overflow-y-auto border border-slate-200 rounded-2xl bg-slate-50/50 p-4 space-y-3.5">
                  {chatMessages.length === 0 ? (
                    <div className="text-center py-10 text-slate-400 text-xs">
                      No comments or discussion yet. Write a message below to start real-time updates!
                    </div>
                  ) : (
                    chatMessages.map((msg) => {
                      const isCurrentUser = msg.user.id === currentUserId;
                      return (
                        <div
                          key={msg.id}
                          className={`flex flex-col max-w-[85%] ${
                            isCurrentUser ? "ml-auto items-end" : "mr-auto items-start"
                          }`}
                        >
                          <span className="text-[10px] text-slate-400 font-semibold mb-0.5">
                            {msg.user.name} &bull; {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                          <div
                            className={`rounded-2xl px-3.5 py-2 text-sm ${
                              isCurrentUser
                                ? "bg-blue-600 text-white rounded-tr-none"
                                : "bg-slate-200 text-slate-800 rounded-tl-none"
                            }`}
                          >
                            {msg.content}
                          </div>
                        </div>
                      );
                    })
                  )}
                  <div ref={chatEndRef} />
                </div>

                {/* Send Input */}
                <form onSubmit={handleSendMessage} className="flex gap-2">
                  <input
                    type="text"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="Type a message..."
                    className="flex-grow rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <button
                    type="submit"
                    className="rounded-xl bg-blue-600 p-2.5 text-white hover:bg-blue-700 shadow flex items-center justify-center active:scale-[0.98] transition-all"
                  >
                    <Send size={16} />
                  </button>
                </form>

              </div>

            </div>
          </div>
        </div>
      )}

    </div>
  );
}
