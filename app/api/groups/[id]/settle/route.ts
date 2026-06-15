import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../../../lib/auth";
import { prisma } from "../../../../lib/prisma";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: groupId } = await params;
    const { fromId, toId, amount, currency } = await req.json();

    if (!fromId || !toId || !amount || amount <= 0) {
      return NextResponse.json(
        { error: "Payer ID, Receiver ID, and a positive amount are required" },
        { status: 400 }
      );
    }

    // Load user names for description
    const [payer, receiver] = await Promise.all([
      prisma.user.findUnique({ where: { id: fromId } }),
      prisma.user.findUnique({ where: { id: toId } }),
    ]);

    if (!payer || !receiver) {
      return NextResponse.json({ error: "Payer or Receiver not found" }, { status: 404 });
    }

    // Create the settlement expense
    const expense = await prisma.$transaction(async (tx) => {
      const createdExpense = await tx.expense.create({
        data: {
          description: `${payer.name} settled with ${receiver.name}`,
          amount: parseFloat(amount),
          currency: currency || "INR",
          splitType: "EXACT",
          expenseDate: new Date(),
          groupId,
          paidById: fromId,
          isSettlement: true,
        },
      });

      // Create single split for the receiver
      await tx.expenseSplit.create({
        data: {
          expenseId: createdExpense.id,
          userId: toId,
          amount: parseFloat(amount),
        },
      });

      return createdExpense;
    });

    return NextResponse.json({
      message: "Settlement payment recorded successfully",
      expense,
    }, { status: 201 });
  } catch (error: any) {
    console.error("Record settlement error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
