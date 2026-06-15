"use client";

import { useEffect, useState, useRef } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { toast } from "react-hot-toast";
import {
  Plus,
  ReceiptIndianRupee,
  Calendar,
  MessageSquare,
  Users,
  Send,
  Loader2,
  ChevronRight,
  ArrowRight,
  TrendingUp,
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
  group: { id: string; name: string };
  splits: ExpenseSplit[];
  isSettlement: boolean;
};

type Group = {
  id: string;
  name: string;
  members: User[];
};

type Message = {
  id: string;
  content: string;
  createdAt: string;
  user: User;
};

export default function ExpensesPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);

  // Modals
  const [showModal, setShowModal] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null);

  // Form States
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState("INR");
  const [splitType, setSplitType] = useState<"EQUAL" | "EXACT" | "PERCENTAGE" | "SHARE">("EQUAL");
  const [paidBy, setPaidBy] = useState("");
  const [individualSplits, setIndividualSplits] = useState<Record<string, string>>({});

  // Selected Expense Details & Chat Drawer
  const [selectedExpense, setSelectedExpense] = useState<Expense | null>(null);
  const [chatMessages, setChatMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const chatEndRef = useRef<HTMLDivElement>(null);
  const pollingTimer = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    }
  }, [status, router]);

  const fetchData = async () => {
    try {
      // Fetch user's expenses
      const expensesRes = await fetch("/api/expenses");
      if (!expensesRes.ok) throw new Error("Failed to load expenses");
      const expensesData = await expensesRes.json();
      setExpenses(expensesData);

      // Fetch user's groups
      const groupsRes = await fetch("/api/groups");
      if (!groupsRes.ok) throw new Error("Failed to load groups");
      const groupsData = await groupsRes.json();
      setGroups(groupsData);
    } catch (err) {
      toast.error("Failed to load dashboard data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (status === "authenticated") {
      fetchData();
    }
  }, [status]);

  // Chat Polling when drawer is open
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

  const handleGroupChange = (groupId: string) => {
    const group = groups.find((g) => g.id === groupId);
    setSelectedGroup(group || null);
    setPaidBy("");
    setIndividualSplits({});
  };

  const handleAddExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedGroup || !description.trim() || !amount || !paidBy) {
      toast.error("Please fill in all required fields");
      return;
    }

    const total = parseFloat(amount);
    if (isNaN(total) || total <= 0) {
      toast.error("Amount must be a positive number");
      return;
    }

    const splits: { userId: string; value: number }[] = [];

    if (splitType === "EQUAL") {
      const share = total / selectedGroup.members.length;
      selectedGroup.members.forEach((member) => {
        splits.push({ userId: member.id, value: share });
      });
    } else if (splitType === "EXACT") {
      let sum = 0;
      for (const member of selectedGroup.members) {
        const val = parseFloat(individualSplits[member.id] || "0");
        if (isNaN(val) || val < 0) {
          toast.error("Split values must be positive numbers");
          return;
        }
        sum += val;
        splits.push({ userId: member.id, value: val });
      }

      if (Math.abs(sum - total) > 0.02) {
        toast.error(`Total of splits (₹${sum.toFixed(2)}) must match the expense amount (₹${total.toFixed(2)})`);
        return;
      }
    } else if (splitType === "PERCENTAGE") {
      let sum = 0;
      for (const member of selectedGroup.members) {
        const pct = parseFloat(individualSplits[member.id] || "0");
        if (isNaN(pct) || pct < 0) {
          toast.error("Percentage values must be positive");
          return;
        }
        sum += pct;
        splits.push({ userId: member.id, value: (pct / 100) * total });
      }

      if (Math.abs(sum - 100) > 0.05) {
        toast.error("Total percentage splits must equal 100%");
        return;
      }
    } else if (splitType === "SHARE") {
      let totalShares = 0;
      const shares: Record<string, number> = {};

      for (const member of selectedGroup.members) {
        const sh = parseFloat(individualSplits[member.id] || "0");
        if (isNaN(sh) || sh < 0) {
          toast.error("Share units must be positive");
          return;
        }
        totalShares += sh;
        shares[member.id] = sh;
      }

      if (totalShares <= 0) {
        toast.error("Total shares must be greater than 0");
        return;
      }

      selectedGroup.members.forEach((member) => {
        const userShare = shares[member.id] || 0;
        splits.push({ userId: member.id, value: (userShare / totalShares) * total });
      });
    }

    try {
      const res = await fetch("/api/expenses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          description: description.trim(),
          amount: total,
          currency,
          splitType,
          groupId: selectedGroup.id,
          paidById: paidBy,
          splits,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || "Failed to create expense");
      } else {
        toast.success("Expense recorded successfully!");
        // Reset form
        setDescription("");
        setAmount("");
        setSelectedGroup(null);
        setPaidBy("");
        setIndividualSplits({});
        setShowModal(false);
        fetchData();
      }
    } catch (err) {
      toast.error("An error occurred");
    }
  };

  const totalSum = expenses.reduce((sum, exp) => sum + exp.amount, 0);
  const currentUserId = session?.user ? (session.user as any).id : null;

  if (loading) {
    return (
      <div className="flex h-[70vh] flex-col items-center justify-center gap-3">
        <Loader2 className="animate-spin text-blue-500 h-10 w-10" />
        <p className="text-slate-500 text-sm font-medium">Loading your expenses...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 p-6 md:p-10 text-slate-900">
      <div className="mx-auto max-w-7xl">
        
        {/* Header */}
        <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl md:text-4xl font-extrabold text-slate-800">
              Expenses History
            </h1>
            <p className="mt-1.5 text-slate-500 text-sm md:text-base">
              Track, split, and audit shared expenses across all your active groups.
            </p>
          </div>

          <button
            onClick={() => {
              if (groups.length === 0) {
                toast.error("Please create an expense group first.");
                return;
              }
              // Pre-select first group
              setSelectedGroup(groups[0]);
              setPaidBy(currentUserId || "");
              setShowModal(true);
            }}
            className="flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white shadow hover:bg-emerald-700 hover:scale-[1.02] active:scale-[0.98] transition-all self-start sm:self-center"
          >
            <Plus size={16} />
            Add Expense
          </button>
        </div>

        {/* Quick Stats */}
        <div className="mb-8 grid gap-6 sm:grid-cols-2">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Combined Spent</p>
            <h2 className="mt-2.5 text-3xl font-extrabold text-slate-800">
              ₹{totalSum.toFixed(2)}
            </h2>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Recorded Transactions</p>
            <h2 className="mt-2.5 text-3xl font-extrabold text-slate-800">
              {expenses.length}
            </h2>
          </div>
        </div>

        {/* Expenses List */}
        {expenses.length === 0 ? (
          <div className="rounded-3xl bg-white border border-slate-200 p-16 text-center shadow-sm max-w-3xl mx-auto">
            <ReceiptIndianRupee className="mx-auto mb-4 h-16 w-16 text-slate-300" />
            <h2 className="text-2xl font-bold text-slate-700">No Expenses Recorded</h2>
            <p className="mt-2 text-slate-500 max-w-sm mx-auto text-sm">
              Keep track of shared bills by clicking "Add Expense" above or navigating to a specific group details page.
            </p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left text-sm text-slate-700">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-400 uppercase tracking-wider">
                    <th className="p-4 pl-6">Description</th>
                    <th className="p-4">Group</th>
                    <th className="p-4">Paid By</th>
                    <th className="p-4">Date</th>
                    <th className="p-4">Amount</th>
                    <th className="p-4 text-right pr-6">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {expenses.map((expense) => (
                    <tr
                      key={expense.id}
                      onClick={() => {
                        setSelectedExpense(expense);
                        setChatMessages([]);
                      }}
                      className={`hover:bg-slate-50 transition-colors cursor-pointer group ${
                        expense.isSettlement ? "bg-slate-50/30 opacity-80" : ""
                      }`}
                    >
                      <td className="p-4 pl-6 font-bold text-slate-800 group-hover:text-blue-600 transition-colors">
                        {expense.description}
                        {expense.isSettlement && (
                          <span className="ml-2 rounded bg-slate-200 px-1.5 py-0.5 text-[10px] font-bold text-slate-700">
                            Settlement
                          </span>
                        )}
                      </td>
                      <td className="p-4 font-semibold text-slate-500">
                        {expense.group.name}
                      </td>
                      <td className="p-4">
                        {expense.paidBy.name}
                      </td>
                      <td className="p-4 text-slate-400">
                        {new Date(expense.expenseDate).toLocaleDateString()}
                      </td>
                      <td className="p-4 font-extrabold text-slate-800">
                        ₹{expense.amount.toFixed(2)}
                      </td>
                      <td className="p-4 text-right pr-6 text-slate-400 group-hover:text-blue-500 font-bold transition-colors">
                        <span className="inline-flex items-center gap-1">
                          Discuss
                          <ChevronRight size={16} />
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Modal: Add Expense */}
        {showModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm overflow-y-auto">
            <div className="w-full max-w-lg rounded-3xl bg-white p-8 border border-slate-100 shadow-2xl my-8">
              <h2 className="mb-6 text-2xl font-bold text-slate-800">Add Shared Expense</h2>
              
              <form onSubmit={handleAddExpense} className="space-y-5">
                
                {/* Select Group */}
                <div>
                  <label className="mb-1.5 block text-xs font-bold text-slate-500 uppercase tracking-wider">
                    Select Group
                  </label>
                  <select
                    value={selectedGroup?.id || ""}
                    onChange={(e) => handleGroupChange(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 p-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
                  >
                    {groups.map((group) => (
                      <option key={group.id} value={group.id}>
                        {group.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Description */}
                <div>
                  <label className="mb-1.5 block text-xs font-bold text-slate-500 uppercase tracking-wider">
                    Description
                  </label>
                  <input
                    type="text"
                    required
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Utilities bill / Dinner / Taxi"
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
                        {currency === "INR" ? "₹" : "$"}
                      </div>
                      <input
                        type="number"
                        step="0.01"
                        min="0.01"
                        required
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
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
                      value={currency}
                      onChange={(e) => setCurrency(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 p-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
                    >
                      <option value="INR">INR (₹)</option>
                      <option value="USD">USD ($)</option>
                    </select>
                  </div>
                </div>

                {/* Paid By */}
                {selectedGroup && (
                  <div>
                    <label className="mb-1.5 block text-xs font-bold text-slate-500 uppercase tracking-wider">
                      Who Paid?
                    </label>
                    <select
                      value={paidBy}
                      onChange={(e) => setPaidBy(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 p-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
                    >
                      <option value="" disabled>Select payer...</option>
                      {selectedGroup.members.map((member) => (
                        <option key={member.id} value={member.id}>
                          {member.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

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
                          setSplitType(type);
                          setIndividualSplits({});
                        }}
                        className={`rounded-lg py-1.5 text-xs font-semibold transition-all ${
                          splitType === type
                            ? "bg-emerald-600 text-white shadow-sm"
                            : "text-slate-500 hover:text-slate-800"
                        }`}
                      >
                        {type}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Split Previews */}
                {selectedGroup && splitType !== "EQUAL" && (
                  <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4 space-y-3">
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                      {splitType === "EXACT" && "Specify amounts (sum must equal total)"}
                      {splitType === "PERCENTAGE" && "Specify percentages (sum must equal 100%)"}
                      {splitType === "SHARE" && "Specify share units (e.g. Aisha: 2, Rohan: 1)"}
                    </p>
                    
                    {selectedGroup.members.map((member) => (
                      <div key={member.id} className="flex items-center justify-between">
                        <span className="text-sm font-semibold text-slate-700">{member.name}</span>
                        <div className="relative w-32">
                          {splitType === "EXACT" && (
                            <div className="absolute inset-y-0 left-0 flex items-center pl-2.5 pointer-events-none text-slate-400 text-xs font-bold">
                              ₹
                            </div>
                          )}
                          <input
                            type="number"
                            step="any"
                            required
                            value={individualSplits[member.id] || ""}
                            onChange={(e) =>
                              setIndividualSplits((prev) => ({
                                ...prev,
                                [member.id]: e.target.value,
                              }))
                            }
                            placeholder={
                              splitType === "EXACT" ? "0.00" : splitType === "PERCENTAGE" ? "0%" : "0 shares"
                            }
                            className={`block w-full pr-2.5 py-1.5 rounded-lg border border-slate-200 text-sm text-right focus:outline-none focus:ring-1 focus:ring-emerald-500 ${
                              splitType === "EXACT" ? "pl-6" : "pl-2"
                            }`}
                          />
                          {splitType === "PERCENTAGE" && (
                            <div className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none text-slate-400 text-xs font-bold">
                              %
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <div className="mt-8 flex justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-semibold hover:bg-slate-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white shadow hover:bg-emerald-700"
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
                    Group: {selectedExpense.group.name} &bull; Paid by {selectedExpense.paidBy.name} on{" "}
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
    </div>
  );
}