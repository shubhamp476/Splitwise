"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { toast } from "react-hot-toast";
import { Plus, Users, Calendar, ArrowRight, Loader2, Mail, Info } from "lucide-react";

type Member = {
  id: string;
  name: string;
  email: string;
};

type Group = {
  id: string;
  name: string;
  members: Member[];
  createdAt: string;
};

export default function GroupsPage() {
  const { status } = useSession();
  const router = useRouter();

  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  // Form States
  const [groupName, setGroupName] = useState("");
  const [memberEmailInput, setMemberEmailInput] = useState("");
  const [emailsList, setEmailsList] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    }
  }, [status, router]);

  const fetchGroups = async () => {
    try {
      const res = await fetch("/api/groups");
      if (!res.ok) throw new Error("Failed to load groups");
      const data = await res.json();
      setGroups(data);
    } catch (err) {
      toast.error("Failed to load your expense groups");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (status === "authenticated") {
      fetchGroups();
    }
  }, [status]);

  const handleAddEmail = () => {
    const email = memberEmailInput.trim().toLowerCase();
    if (!email) return;

    // Simple email regex validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      toast.error("Please enter a valid email address");
      return;
    }

    if (emailsList.includes(email)) {
      toast.error("Email is already added to the invite list");
      return;
    }

    setEmailsList((prev) => [...prev, email]);
    setMemberEmailInput("");
  };

  const handleRemoveEmail = (idxToRemove: number) => {
    setEmailsList((prev) => prev.filter((_, idx) => idx !== idxToRemove));
  };

  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!groupName.trim()) {
      toast.error("Group name is required");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/groups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: groupName.trim(),
          emails: emailsList,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || "Failed to create group");
      } else {
        toast.success("Group created successfully!");
        setGroupName("");
        setEmailsList([]);
        setShowModal(false);
        fetchGroups();
        // Redirect to detail page
        router.push(`/groups/${data.id}`);
      }
    } catch (err) {
      toast.error("An error occurred during group creation");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-[70vh] flex-col items-center justify-center gap-3">
        <Loader2 className="animate-spin text-blue-500 h-10 w-10" />
        <p className="text-slate-500 text-sm font-medium">Loading your groups...</p>
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
              Expense Groups
            </h1>
            <p className="mt-1.5 text-slate-500 text-sm md:text-base">
              Manage shared expense groups and memberships over time.
            </p>
          </div>

          <button
            onClick={() => setShowModal(true)}
            className="flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white shadow hover:bg-blue-700 hover:scale-[1.02] active:scale-[0.98] transition-all self-start sm:self-center"
          >
            <Plus size={16} />
            Create Group
          </button>
        </div>

        {/* Empty State vs List */}
        {groups.length === 0 ? (
          <div className="rounded-3xl bg-white border border-slate-200 p-16 text-center shadow-sm max-w-3xl mx-auto">
            <Users className="mx-auto mb-4 h-16 w-16 text-slate-300" />
            <h2 className="text-2xl font-bold text-slate-700">
              No Groups Yet
            </h2>
            <p className="mt-2 text-slate-500 max-w-sm mx-auto text-sm">
              Create your first shared expense group to start splitting utilities, dinners, or travel costs with friends.
            </p>
            <button
              onClick={() => setShowModal(true)}
              className="mt-6 rounded-xl bg-blue-600 px-6 py-3 text-sm font-semibold text-white hover:bg-blue-700 shadow"
            >
              Create First Group
            </button>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {groups.map((group) => (
              <Link
                href={`/groups/${group.id}`}
                key={group.id}
                className="group rounded-3xl border border-slate-200 bg-white p-6 shadow-sm hover:shadow-md hover:border-slate-300 transition-all flex flex-col justify-between"
              >
                <div>
                  <h3 className="text-xl font-bold text-slate-800 group-hover:text-blue-600 transition-colors">
                    {group.name}
                  </h3>

                  <div className="mt-4">
                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                      Members ({group.members.length})
                    </p>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {group.members.map((member) => (
                        <span
                          key={member.id}
                          className="rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-600 font-semibold"
                        >
                          {member.name}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-400">
                  <span className="flex items-center gap-1.5 font-medium">
                    <Calendar size={14} />
                    Created {new Date(group.createdAt).toLocaleDateString()}
                  </span>
                  <span className="flex items-center gap-1 font-bold text-blue-600 group-hover:text-blue-700">
                    Open
                    <ArrowRight size={14} className="transition-transform group-hover:translate-x-0.5" />
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}

        {/* Create Group Modal */}
        {showModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
            <div className="w-full max-w-md rounded-3xl bg-white p-8 border border-slate-100 shadow-2xl">
              <h2 className="mb-6 text-2xl font-bold text-slate-800">
                Create Group
              </h2>

              <form onSubmit={handleCreateGroup} className="space-y-4">
                {/* Group Name */}
                <div>
                  <label className="mb-1.5 block text-xs font-bold text-slate-500 uppercase tracking-wider">
                    Group Name
                  </label>
                  <input
                    type="text"
                    required
                    value={groupName}
                    onChange={(e) => setGroupName(e.target.value)}
                    placeholder="Flatmates / Bali Trip"
                    className="w-full rounded-xl border border-slate-200 p-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {/* Add Invites by Email */}
                <div>
                  <label className="mb-1.5 block text-xs font-bold text-slate-500 uppercase tracking-wider">
                    Invite Friends (by Email)
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="email"
                      value={memberEmailInput}
                      onChange={(e) => setMemberEmailInput(e.target.value)}
                      placeholder="friend@example.com"
                      className="flex-grow rounded-xl border border-slate-200 p-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <button
                      type="button"
                      onClick={handleAddEmail}
                      className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold hover:bg-slate-100 active:scale-[0.98] transition-all"
                    >
                      Add
                    </button>
                  </div>
                </div>

                {/* Emails List Preview */}
                {emailsList.length > 0 && (
                  <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4 space-y-2">
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                      Invite List ({emailsList.length})
                    </p>
                    <div className="flex flex-wrap gap-1.5 max-h-[100px] overflow-y-auto pr-1">
                      {emailsList.map((email, idx) => (
                        <span
                          key={email}
                          className="inline-flex items-center gap-1.5 rounded-lg bg-blue-100 px-2.5 py-1 text-xs text-blue-700 font-bold"
                        >
                          <span className="truncate max-w-[150px]">{email}</span>
                          <button
                            type="button"
                            onClick={() => handleRemoveEmail(idx)}
                            className="text-blue-500 hover:text-blue-800 font-bold"
                          >
                            &times;
                          </button>
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                <div className="rounded-xl border border-blue-100 bg-blue-50/50 p-3 text-xs text-slate-500 flex gap-2">
                  <Info size={16} className="text-blue-500 shrink-0 mt-0.5" />
                  <p>
                    Invited users who don't have accounts will be provisioned a placeholder login credential using their email and default password <span className="font-semibold text-slate-700">password123</span>.
                  </p>
                </div>

                <div className="mt-8 flex justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setGroupName("");
                      setEmailsList([]);
                      setShowModal(false);
                    }}
                    className="rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-semibold hover:bg-slate-50"
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    disabled={submitting}
                    className="rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 shadow flex items-center gap-2"
                  >
                    {submitting ? (
                      <Loader2 className="animate-spin" size={16} />
                    ) : (
                      "Create Group"
                    )}
                  </button>
                </div>
              </form>

            </div>
          </div>
        )}
      </div>
    </div>
  );
}