import { prisma } from "./prisma";

export type Transaction = {
  fromId: string;
  fromName: string;
  toId: string;
  toName: string;
  amount: number;
};

export type MemberBalance = {
  userId: string;
  name: string;
  email: string;
  paid: number;
  owed: number;
  net: number;
};

/**
 * Calculates net balances and returns simplified transactions to clear all debts within a group.
 */
export async function getGroupBalances(groupId: string) {
  // 1. Fetch group members
  const memberships = await prisma.membership.findMany({
    where: { groupId, status: "ACTIVE" },
    include: { user: true },
  });

  const members = memberships.map((m) => m.user);
  const memberMap = new Map(members.map((m) => [m.id, m]));

  // 2. Fetch all expenses and their splits in the group
  const expenses = await prisma.expense.findMany({
    where: { groupId },
    include: {
      splits: true,
    },
  });

  // 3. Initialize balances for all group members
  const balances: Record<string, MemberBalance> = {};
  for (const member of members) {
    balances[member.id] = {
      userId: member.id,
      name: member.name,
      email: member.email,
      paid: 0,
      owed: 0,
      net: 0,
    };
  }

  // 4. Calculate total paid and owed for each member
  for (const expense of expenses) {
    const paidById = expense.paidById;
    
    // Add to paid amount if member is still in the group (or handle gracefully if not)
    if (balances[paidById]) {
      balances[paidById].paid += expense.amount;
    }

    // Add to owed amount from splits
    for (const split of expense.splits) {
      if (balances[split.userId]) {
        balances[split.userId].owed += split.amount;
      }
    }
  }

  // Calculate net balances (paid - owed)
  for (const userId in balances) {
    balances[userId].net = parseFloat((balances[userId].paid - balances[userId].owed).toFixed(2));
  }

  // 5. Debt Simplification Algorithm
  // Find debtors (net < 0) and creditors (net > 0)
  const debtors: { id: string; net: number }[] = [];
  const creditors: { id: string; net: number }[] = [];

  for (const userId in balances) {
    const net = balances[userId].net;
    if (net < -0.01) {
      debtors.push({ id: userId, net });
    } else if (net > 0.01) {
      creditors.push({ id: userId, net });
    }
  }

  const transactions: Transaction[] = [];

  // Sort debtors ascending (most negative first) and creditors descending (most positive first)
  debtors.sort((a, b) => a.net - b.net);
  creditors.sort((a, b) => b.net - a.net);

  let dIndex = 0;
  let cIndex = 0;

  while (dIndex < debtors.length && cIndex < creditors.length) {
    const debtor = debtors[dIndex];
    const creditor = creditors[cIndex];

    const amountOwed = -debtor.net;
    const amountCredited = creditor.net;

    const settledAmount = parseFloat(Math.min(amountOwed, amountCredited).toFixed(2));

    if (settledAmount > 0) {
      const fromUser = memberMap.get(debtor.id)!;
      const toUser = memberMap.get(creditor.id)!;

      transactions.push({
        fromId: debtor.id,
        fromName: fromUser.name,
        toId: creditor.id,
        toName: toUser.name,
        amount: settledAmount,
      });
    }

    // Update balances
    debtor.net += settledAmount;
    creditor.net -= settledAmount;

    // Move pointers
    if (Math.abs(debtor.net) < 0.01) {
      dIndex++;
    }
    if (Math.abs(creditor.net) < 0.01) {
      cIndex++;
    }
  }

  return {
    balances: Object.values(balances),
    transactions,
  };
}

/**
 * Calculates a summary of balances across all groups for a specific user.
 */
export async function getUserDashboardBalances(userId: string) {
  // Find all groups the user belongs to
  const memberships = await prisma.membership.findMany({
    where: { userId, status: "ACTIVE" },
    include: {
      group: {
        include: {
          memberships: {
            where: { status: "ACTIVE" },
            include: { user: true },
          },
        },
      },
    },
  });

  let totalOwedToYou = 0;
  let totalYouOwe = 0;

  const groupSummaries = [];
  const debtsByPeople: Record<string, { userId: string; name: string; email: string; amount: number }> = {};

  for (const membership of memberships) {
    const group = membership.group;
    const { transactions } = await getGroupBalances(group.id);

    // Calculate user's net position in this group
    let groupNet = 0;
    const groupTransactions = [];

    for (const tx of transactions) {
      if (tx.fromId === userId) {
        // You owe someone
        totalYouOwe += tx.amount;
        groupNet -= tx.amount;
        groupTransactions.push(tx);

        if (!debtsByPeople[tx.toId]) {
          const toUser = group.memberships.find((m) => m.userId === tx.toId)?.user;
          debtsByPeople[tx.toId] = {
            userId: tx.toId,
            name: tx.toName,
            email: toUser?.email || "",
            amount: 0,
          };
        }
        debtsByPeople[tx.toId].amount -= tx.amount;
      } else if (tx.toId === userId) {
        // Someone owes you
        totalOwedToYou += tx.amount;
        groupNet += tx.amount;
        groupTransactions.push(tx);

        if (!debtsByPeople[tx.fromId]) {
          const fromUser = group.memberships.find((m) => m.userId === tx.fromId)?.user;
          debtsByPeople[tx.fromId] = {
            userId: tx.fromId,
            name: tx.fromName,
            email: fromUser?.email || "",
            amount: 0,
          };
        }
        debtsByPeople[tx.fromId].amount += tx.amount;
      }
    }

    groupSummaries.push({
      groupId: group.id,
      name: group.name,
      net: parseFloat(groupNet.toFixed(2)),
      memberCount: group.memberships.length,
    });
  }

  // Format list of other users you have relationships with
  const peopleBalances = Object.values(debtsByPeople)
    .map((p) => ({
      ...p,
      amount: parseFloat(p.amount.toFixed(2)),
    }))
    .filter((p) => Math.abs(p.amount) > 0.01);

  return {
    totalOwedToYou: parseFloat(totalOwedToYou.toFixed(2)),
    totalYouOwe: parseFloat(totalYouOwe.toFixed(2)),
    netBalance: parseFloat((totalOwedToYou - totalYouOwe).toFixed(2)),
    groupSummaries,
    peopleBalances,
  };
}
