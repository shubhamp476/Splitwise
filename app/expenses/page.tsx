"use client";

import { useState } from "react";
import { Plus, ReceiptIndianRupee } from "lucide-react";

type Expense = {
  id: string;
  description: string;
  amount: number;
  paidBy: string;
  category: string;
  date: string;
};

export default function ExpensesPage() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [showModal, setShowModal] = useState(false);

  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [paidBy, setPaidBy] = useState("");
  const [category, setCategory] = useState("");

  const handleAddExpense = () => {
    if (!description || !amount || !paidBy) {
      alert("Please fill all required fields");
      return;
    }

    const newExpense: Expense = {
      id: crypto.randomUUID(),
      description,
      amount: Number(amount),
      paidBy,
      category: category || "Other",
      date: new Date().toLocaleDateString(),
    };

    setExpenses((prev) => [...prev, newExpense]);

    setDescription("");
    setAmount("");
    setPaidBy("");
    setCategory("");

    setShowModal(false);
  };

  const totalExpenses = expenses.reduce(
    (sum, expense) => sum + expense.amount,
    0
  );

  return (
    <div className="min-h-screen bg-slate-50 p-8">
      <div className="mx-auto max-w-7xl">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold">
              Expenses
            </h1>

            <p className="mt-2 text-slate-600">
              Track and manage shared expenses
            </p>
          </div>

          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 rounded-xl bg-green-600 px-5 py-3 text-white hover:bg-green-700"
          >
            <Plus size={20} />
            Add Expense
          </button>
        </div>

        {/* Stats */}
        <div className="mb-8 grid gap-6 md:grid-cols-2">
          <div className="rounded-2xl bg-white p-6 shadow-sm">
            <p className="text-sm text-slate-500">
              Total Expenses
            </p>

            <h2 className="mt-2 text-3xl font-bold">
              ₹{totalExpenses.toFixed(2)}
            </h2>
          </div>

          <div className="rounded-2xl bg-white p-6 shadow-sm">
            <p className="text-sm text-slate-500">
              Total Transactions
            </p>

            <h2 className="mt-2 text-3xl font-bold">
              {expenses.length}
            </h2>
          </div>
        </div>

        {/* Empty State */}
        {expenses.length === 0 ? (
          <div className="rounded-3xl bg-white p-16 text-center shadow-sm">
            <ReceiptIndianRupee className="mx-auto mb-4 h-16 w-16 text-slate-400" />

            <h2 className="text-2xl font-semibold">
              No Expenses Yet
            </h2>

            <p className="mt-2 text-slate-500">
              Start by adding your first expense.
            </p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-3xl bg-white shadow-sm">
            <table className="w-full">
              <thead>
                <tr className="bg-slate-100">
                  <th className="p-4 text-left">
                    Description
                  </th>
                  <th className="p-4 text-left">
                    Amount
                  </th>
                  <th className="p-4 text-left">
                    Paid By
                  </th>
                  <th className="p-4 text-left">
                    Category
                  </th>
                  <th className="p-4 text-left">
                    Date
                  </th>
                </tr>
              </thead>

              <tbody>
                {expenses.map((expense) => (
                  <tr
                    key={expense.id}
                    className="border-b"
                  >
                    <td className="p-4">
                      {expense.description}
                    </td>

                    <td className="p-4 font-semibold">
                      ₹{expense.amount}
                    </td>

                    <td className="p-4">
                      {expense.paidBy}
                    </td>

                    <td className="p-4">
                      {expense.category}
                    </td>

                    <td className="p-4">
                      {expense.date}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Modal */}
        {showModal && (
          <div className="fixed inset-0 flex items-center justify-center bg-black/50">
            <div className="w-full max-w-md rounded-3xl bg-white p-8">
              <h2 className="mb-6 text-2xl font-bold">
                Add Expense
              </h2>

              <div className="space-y-4">
                <input
                  type="text"
                  placeholder="Description"
                  value={description}
                  onChange={(e) =>
                    setDescription(e.target.value)
                  }
                  className="w-full rounded-xl border p-3"
                />

                <input
                  type="number"
                  placeholder="Amount"
                  value={amount}
                  onChange={(e) =>
                    setAmount(e.target.value)
                  }
                  className="w-full rounded-xl border p-3"
                />

                <input
                  type="text"
                  placeholder="Paid By"
                  value={paidBy}
                  onChange={(e) =>
                    setPaidBy(e.target.value)
                  }
                  className="w-full rounded-xl border p-3"
                />

                <input
                  type="text"
                  placeholder="Category"
                  value={category}
                  onChange={(e) =>
                    setCategory(e.target.value)
                  }
                  className="w-full rounded-xl border p-3"
                />
              </div>

              <div className="mt-6 flex justify-end gap-3">
                <button
                  onClick={() =>
                    setShowModal(false)
                  }
                  className="rounded-xl border px-4 py-2"
                >
                  Cancel
                </button>

                <button
                  onClick={handleAddExpense}
                  className="rounded-xl bg-green-600 px-4 py-2 text-white"
                >
                  Add Expense
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}