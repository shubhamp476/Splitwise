"use client";

import { useState } from "react";
import { Plus, Users, Calendar } from "lucide-react";

type Group = {
  id: string;
  name: string;
  description: string;
  members: string[];
  createdAt: string;
};

export default function GroupsPage() {
  const [groups, setGroups] = useState<Group[]>([]);
  const [showModal, setShowModal] = useState(false);

  const [groupName, setGroupName] = useState("");
  const [description, setDescription] = useState("");
  const [members, setMembers] = useState("");

  const handleCreateGroup = () => {
    if (!groupName.trim()) {
      alert("Group name is required");
      return;
    }

    const newGroup: Group = {
      id: crypto.randomUUID(),
      name: groupName,
      description,
      members: members
        .split(",")
        .map((member) => member.trim())
        .filter(Boolean),
      createdAt: new Date().toLocaleDateString(),
    };

    setGroups((prev) => [...prev, newGroup]);

    setGroupName("");
    setDescription("");
    setMembers("");
    setShowModal(false);
  };

  return (
    <div className="min-h-screen bg-slate-50 p-8">
      <div className="mx-auto max-w-7xl">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold text-slate-800">
              Expense Groups
            </h1>

            <p className="mt-2 text-slate-600">
              Manage shared expense groups and members.
            </p>
          </div>

          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-white shadow transition hover:bg-blue-700"
          >
            <Plus size={20} />
            Create Group
          </button>
        </div>

        {/* Empty State */}
        {groups.length === 0 ? (
          <div className="rounded-3xl bg-white p-16 text-center shadow-sm">
            <Users className="mx-auto mb-4 h-16 w-16 text-slate-400" />

            <h2 className="text-2xl font-semibold text-slate-700">
              No Groups Yet
            </h2>

            <p className="mt-2 text-slate-500">
              Create your first expense group to get started.
            </p>

            <button
              onClick={() => setShowModal(true)}
              className="mt-6 rounded-xl bg-blue-600 px-6 py-3 text-white hover:bg-blue-700"
            >
              Create First Group
            </button>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {groups.map((group) => (
              <div
                key={group.id}
                className="rounded-3xl bg-white p-6 shadow-sm transition hover:shadow-md"
              >
                <h3 className="text-2xl font-bold text-slate-800">
                  {group.name}
                </h3>

                <p className="mt-2 text-slate-600">
                  {group.description || "No description"}
                </p>

                <div className="mt-4">
                  <p className="font-medium text-slate-700">
                    Members ({group.members.length})
                  </p>

                  <div className="mt-2 flex flex-wrap gap-2">
                    {group.members.map((member) => (
                      <span
                        key={member}
                        className="rounded-full bg-blue-100 px-3 py-1 text-sm text-blue-700"
                      >
                        {member}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="mt-6 flex items-center gap-2 text-sm text-slate-500">
                  <Calendar size={16} />
                  Created {group.createdAt}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Create Group Modal */}
        {showModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <div className="w-full max-w-md rounded-3xl bg-white p-8">
              <h2 className="mb-6 text-2xl font-bold">
                Create Group
              </h2>

              <div className="space-y-4">
                <div>
                  <label className="mb-2 block font-medium">
                    Group Name
                  </label>

                  <input
                    type="text"
                    value={groupName}
                    onChange={(e) =>
                      setGroupName(e.target.value)
                    }
                    placeholder="Flatmates"
                    className="w-full rounded-xl border p-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="mb-2 block font-medium">
                    Description
                  </label>

                  <textarea
                    value={description}
                    onChange={(e) =>
                      setDescription(e.target.value)
                    }
                    placeholder="Monthly shared expenses"
                    className="w-full rounded-xl border p-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="mb-2 block font-medium">
                    Members
                  </label>

                  <input
                    type="text"
                    value={members}
                    onChange={(e) =>
                      setMembers(e.target.value)
                    }
                    placeholder="Aisha, Rohan, Priya, Meera"
                    className="w-full rounded-xl border p-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />

                  <p className="mt-1 text-sm text-slate-500">
                    Separate members using commas.
                  </p>
                </div>
              </div>

              <div className="mt-8 flex justify-end gap-3">
                <button
                  onClick={() => setShowModal(false)}
                  className="rounded-xl border px-5 py-2"
                >
                  Cancel
                </button>

                <button
                  onClick={handleCreateGroup}
                  className="rounded-xl bg-blue-600 px-5 py-2 text-white hover:bg-blue-700"
                >
                  Create Group
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}