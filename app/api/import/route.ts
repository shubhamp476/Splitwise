import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../lib/auth";
import { prisma } from "../../lib/prisma";
import bcrypt from "bcryptjs";

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { groupId, rows, anomalies } = await req.json();

    if (!groupId || !rows || !Array.isArray(rows)) {
      return NextResponse.json(
        { error: "Group ID and rows array are required" },
        { status: 400 }
      );
    }

    // 1. Verify group exists and user is member
    const group = await prisma.group.findUnique({
      where: { id: groupId },
      include: {
        memberships: {
          where: { status: "ACTIVE" },
          include: { user: true },
        },
      },
    });

    if (!group) {
      return NextResponse.json({ error: "Group not found" }, { status: 404 });
    }

    const isMember = group.memberships.some((m) => m.userId === (session.user as any).id);
    if (!isMember) {
      return NextResponse.json({ error: "Access Denied" }, { status: 403 });
    }

    // Cache existing group members by name (case-insensitive)
    const membersByName = new Map();
    group.memberships.forEach((m) => {
      membersByName.set(m.user.name.toLowerCase().trim(), m.user);
    });

    // 2. Map and parse rows
    const defaultPassword = await bcrypt.hash("password123", 10);
    const savedExpenses = [];

    // Transaction to ensure atomic import
    await prisma.$transaction(async (tx) => {
      // Create import logs for anomalies
      if (anomalies && Array.isArray(anomalies)) {
        for (const log of anomalies) {
          await tx.importLog.create({
            data: {
              rowNumber: log.row || 0,
              issue: log.issue || "Anomaly",
              action: log.action || "Flagged",
            },
          });
        }
      }

      for (const row of rows) {
        let paidByName = typeof row.paid_by === "string" ? row.paid_by.trim() : "";
        if (!paidByName) {
          paidByName = "Unknown";
        }

        const normalizedName = paidByName.toLowerCase();

        // Find user in group members
        let payerUser = membersByName.get(normalizedName);

        // If not in group, check if user exists globally
        if (!payerUser) {
          payerUser = await tx.user.findFirst({
            where: {
              name: {
                equals: paidByName,
                mode: "insensitive",
              },
            },
          });

          // If not exists globally, create stub user
          if (!payerUser) {
            const email = `${normalizedName.replace(/\s+/g, "")}@example.com`;
            const existingEmailUser = await tx.user.findUnique({ where: { email } });
            
            if (existingEmailUser) {
              payerUser = existingEmailUser;
            } else {
              payerUser = await tx.user.create({
                data: {
                  name: paidByName,
                  email,
                  password: defaultPassword,
                },
              });
            }
          }

          // Add to group memberships
          const existingMem = await tx.membership.findUnique({
            where: {
              userId_groupId: {
                userId: payerUser.id,
                groupId,
              },
            },
          });

          if (!existingMem) {
            await tx.membership.create({
              data: {
                userId: payerUser.id,
                groupId,
                joinedAt: new Date(),
                status: "ACTIVE",
              },
            });
          } else if (existingMem.status === "LEFT") {
            await tx.membership.update({
              where: { id: existingMem.id },
              data: { status: "ACTIVE", leftAt: null, joinedAt: new Date() },
            });
          }

          // Update active members list in cache
          membersByName.set(normalizedName, payerUser);
        }

        // Parse amount (handling commas, negatives, and precision)
        let amountValue = parseFloat(String(row.amount).replace(/,/g, ""));
        if (isNaN(amountValue)) amountValue = 0;
        
        // Convert USD to INR if specified
        const currencyValue = typeof row.currency === "string" ? row.currency.trim().toUpperCase() : "INR";
        if (currencyValue === "USD") {
          amountValue = parseFloat((amountValue * 83).toFixed(2)); // Standard 1 USD = 83 INR
        } else {
          amountValue = parseFloat(Math.abs(amountValue).toFixed(2)); // Ensure non-negative
        }

        // Parse date
        let dateValue = new Date(row.date);
        if (isNaN(dateValue.getTime())) {
          dateValue = new Date();
        }

        // Determine if settlement
        const description = typeof row.description === "string" ? row.description : "";
        const isSettlement = description.toLowerCase().includes("paid back") || description.toLowerCase().includes("settlement");

        // Fetch current active group members (refetched inside transaction to include any newly created stub users)
        const activeMembers = await tx.membership.findMany({
          where: { groupId, status: "ACTIVE" },
        });

        // Create the Expense
        const createdExpense = await tx.expense.create({
          data: {
            description: description || "Imported Expense",
            amount: amountValue,
            currency: "INR",
            splitType: "EQUAL",
            expenseDate: dateValue,
            groupId,
            paidById: payerUser.id,
            isSettlement,
          },
        });

        // Create EQUAL splits
        const splitAmount = parseFloat((amountValue / activeMembers.length).toFixed(2));
        
        for (const member of activeMembers) {
          await tx.expenseSplit.create({
            data: {
              expenseId: createdExpense.id,
              userId: member.userId,
              amount: splitAmount,
            },
          });
        }

        savedExpenses.push(createdExpense);
      }
    });

    return NextResponse.json({
      message: `Successfully imported ${savedExpenses.length} expenses into group!`,
    }, { status: 201 });
  } catch (error: any) {
    console.error("Import CSV error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
