import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../lib/auth";
import { prisma } from "../../lib/prisma";

// GET /api/expenses - Fetch all expenses across all groups the user belongs to
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = (session.user as any).id;

    // Find all groups the user belongs to
    const memberships = await prisma.membership.findMany({
      where: { userId, status: "ACTIVE" },
      select: { groupId: true },
    });

    const groupIds = memberships.map((m: { groupId: string }) => m.groupId);

    if (groupIds.length === 0) {
      return NextResponse.json([]);
    }

    // Fetch all expenses in those groups
    const expenses = await prisma.expense.findMany({
      where: {
        groupId: { in: groupIds },
      },
      include: {
        group: {
          select: { id: true, name: true },
        },
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

    return NextResponse.json(expenses);
  } catch (error: any) {
    console.error("Fetch expenses error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

// POST /api/expenses - Create a new expense and its corresponding splits
export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { description, amount, currency, splitType, groupId, paidById, splits } =
      await req.json();

    if (!description || !amount || !groupId || !paidById || !splits || !Array.isArray(splits)) {
      return NextResponse.json(
        { error: "Missing required fields for creating expense" },
        { status: 400 }
      );
    }

    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      return NextResponse.json({ error: "Amount must be a positive number" }, { status: 400 });
    }

    // Verify splits match total amount (within tiny floating point rounding margin)
    let splitsSum = 0;
    for (const split of splits) {
      splitsSum += parseFloat(split.value);
    }

    if (Math.abs(splitsSum - parsedAmount) > 0.05) {
      return NextResponse.json(
        {
          error: `The sum of splits (₹${splitsSum.toFixed(2)}) must equal the total expense amount (₹${parsedAmount.toFixed(
            2
          )})`,
        },
        { status: 400 }
      );
    }

    // Create expense and splits inside a transaction
    const expense = await prisma.$transaction(async (tx) => {
      const createdExpense = await tx.expense.create({
        data: {
          description: description.trim(),
          amount: parsedAmount,
          currency: currency || "INR",
          splitType,
          expenseDate: new Date(),
          groupId,
          paidById,
          isSettlement: false,
        },
      });

      // Insert all splits
      for (const split of splits) {
        await tx.expenseSplit.create({
          data: {
            expenseId: createdExpense.id,
            userId: split.userId,
            amount: parseFloat(split.value),
          },
        });
      }

      return createdExpense;
    });

    return NextResponse.json({
      message: "Expense recorded successfully",
      expense,
    }, { status: 201 });
  } catch (error: any) {
    console.error("Create expense error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
