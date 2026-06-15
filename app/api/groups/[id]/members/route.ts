import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../../../lib/auth";
import { prisma } from "../../../../lib/prisma";
import { getGroupBalances } from "../../../../lib/balances";
import bcrypt from "bcryptjs";

// POST /api/groups/[id]/members - Add a member to a group by email
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
    const { email } = await req.json();

    if (!email || !email.trim()) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    const normalizedEmail = email.trim().toLowerCase();

    // Find or create invitee
    let invitee = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (!invitee) {
      const defaultPassword = await bcrypt.hash("password123", 10);
      const namePrefix = normalizedEmail.split("@")[0];
      const name = namePrefix.charAt(0).toUpperCase() + namePrefix.slice(1);

      invitee = await prisma.user.create({
        data: {
          name,
          email: normalizedEmail,
          password: defaultPassword,
        },
      });
    }

    // Check if already a member (ACTIVE or LEFT)
    const existingMembership = await prisma.membership.findUnique({
      where: {
        userId_groupId: {
          userId: invitee.id,
          groupId,
        },
      },
    });

    if (existingMembership) {
      if (existingMembership.status === "ACTIVE") {
        return NextResponse.json({ error: "User is already an active member of this group" }, { status: 400 });
      }
      
      // Re-activate membership if they left previously
      await prisma.membership.update({
        where: { id: existingMembership.id },
        data: {
          status: "ACTIVE",
          joinedAt: new Date(),
          leftAt: null,
        },
      });
    } else {
      // Create new membership
      await prisma.membership.create({
        data: {
          userId: invitee.id,
          groupId,
          joinedAt: new Date(),
          status: "ACTIVE",
        },
      });
    }

    return NextResponse.json({
      message: "Member added successfully",
      user: {
        id: invitee.id,
        name: invitee.name,
        email: invitee.email,
      },
    }, { status: 200 });
  } catch (error: any) {
    console.error("Add group member error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

// DELETE /api/groups/[id]/members - Remove a member from a group (strictly requires zero balance)
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: groupId } = await params;
    const { userId } = await req.json();

    if (!userId) {
      return NextResponse.json({ error: "User ID is required" }, { status: 400 });
    }

    // 1. Calculate balances to check if this user has a zero balance
    const { balances } = await getGroupBalances(groupId);
    const userBalance = balances.find((b) => b.userId === userId);

    if (!userBalance) {
      return NextResponse.json({ error: "User is not a member of this group" }, { status: 400 });
    }

    if (Math.abs(userBalance.net) > 0.01) {
      return NextResponse.json(
        {
          error: `Cannot remove member. ${userBalance.name} has a non-zero net balance (₹${userBalance.net.toFixed(
            2
          )}). All outstanding debts must be settled first.`,
        },
        { status: 400 }
      );
    }

    // 2. Mark membership as LEFT (retains history for splits they were part of)
    const membership = await prisma.membership.findUnique({
      where: {
        userId_groupId: {
          userId,
          groupId,
        },
      },
    });

    if (membership) {
      await prisma.membership.update({
        where: { id: membership.id },
        data: {
          status: "LEFT",
          leftAt: new Date(),
        },
      });
    }

    return NextResponse.json({ message: "Member removed from group successfully" });
  } catch (error: any) {
    console.error("Remove group member error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
