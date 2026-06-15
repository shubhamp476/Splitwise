import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../../lib/auth";
import { prisma } from "../../../lib/prisma";
import { getGroupBalances } from "../../../lib/balances";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: groupId } = await params;
    const currentUserId = (session.user as any).id;

    // Verify membership
    const membership = await prisma.membership.findUnique({
      where: {
        userId_groupId: {
          userId: currentUserId,
          groupId,
        },
      },
    });

    if (!membership || membership.status !== "ACTIVE") {
      return NextResponse.json({ error: "Access Denied" }, { status: 403 });
    }

    // 1. Fetch Group Details
    const group = await prisma.group.findUnique({
      where: { id: groupId },
    });

    if (!group) {
      return NextResponse.json({ error: "Group not found" }, { status: 404 });
    }

    // 2. Fetch Expenses (sorted by date descending)
    const expenses = await prisma.expense.findMany({
      where: { groupId },
      include: {
        paidBy: {
          select: { id: true, name: true, email: true },
        },
        splits: {
          include: {
            user: {
              select: { id: true, name: true, email: true },
            },
          },
        },
      },
      orderBy: {
        expenseDate: "desc",
      },
    });

    // 3. Compute Balances and Simplified Transactions
    const { balances, transactions } = await getGroupBalances(groupId);

    return NextResponse.json({
      group: {
        id: group.id,
        name: group.name,
      },
      expenses,
      balances,
      transactions,
    });
  } catch (error: any) {
    console.error("Fetch group details error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
