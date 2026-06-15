import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../lib/auth";
import { prisma } from "../../lib/prisma";
import bcrypt from "bcryptjs";

// GET /api/groups - Fetch all groups the current user belongs to
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = (session.user as any).id;

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
      orderBy: {
        joinedAt: "desc",
      },
    });

    const groups = memberships.map((m) => {
      const g = m.group;
      return {
        id: g.id,
        name: g.name,
        members: g.memberships.map((mem) => ({
          id: mem.user.id,
          name: mem.user.name,
          email: mem.user.email,
        })),
        createdAt: g.createdAt,
      };
    });

    return NextResponse.json(groups);
  } catch (error: any) {
    console.error("Fetch groups error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

// POST /api/groups - Create a new group
export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const currentUserId = (session.user as any).id;
    const { name, emails } = await req.json();

    if (!name || !name.trim()) {
      return NextResponse.json({ error: "Group name is required" }, { status: 400 });
    }

    // 1. Create the Group
    const group = await prisma.group.create({
      data: {
        name: name.trim(),
      },
    });

    // 2. Add creator to the group
    await prisma.membership.create({
      data: {
        userId: currentUserId,
        groupId: group.id,
        joinedAt: new Date(),
        status: "ACTIVE",
      },
    });

    // 3. Process invited member emails
    if (emails && Array.isArray(emails)) {
      const uniqueEmails = [...new Set(emails.map((e) => e.trim().toLowerCase()).filter(Boolean))];

      for (const email of uniqueEmails) {
        // Skip creator's email
        if (email === session.user.email?.toLowerCase()) continue;

        // Find or create the user
        let invitee = await prisma.user.findUnique({
          where: { email },
        });

        if (!invitee) {
          // Create a stub user
          const defaultPassword = await bcrypt.hash("password123", 10);
          const namePrefix = email.split("@")[0];
          const name = namePrefix.charAt(0).toUpperCase() + namePrefix.slice(1);

          invitee = await prisma.user.create({
            data: {
              name,
              email,
              password: defaultPassword,
            },
          });
        }

        // Add user to group
        await prisma.membership.create({
          data: {
            userId: invitee.id,
            groupId: group.id,
            joinedAt: new Date(),
            status: "ACTIVE",
          },
        });
      }
    }

    // Retrieve group with members for response
    const completeGroup = await prisma.group.findUnique({
      where: { id: group.id },
      include: {
        memberships: {
          include: { user: true },
        },
      },
    });

    return NextResponse.json({
      id: completeGroup?.id,
      name: completeGroup?.name,
      members: completeGroup?.memberships.map((m) => ({
        id: m.user.id,
        name: m.user.name,
        email: m.user.email,
      })),
      createdAt: completeGroup?.createdAt,
    }, { status: 201 });
  } catch (error: any) {
    console.error("Create group error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
