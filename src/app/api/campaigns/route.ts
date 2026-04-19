import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

// =======================================
// GET Conversations / Chat List
// =======================================
export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // دعم أعضاء الفريق
    const rawUserId = (session.user as any).id;
    const parentId = (session.user as any).parentId;

    const userId = parentId ?? rawUserId;

    const { searchParams } = new URL(req.url);

    const limit = Number(searchParams.get("limit") || 30);
    const cursor = searchParams.get("cursor");
    const search = searchParams.get("search") || "";

    const contacts = await prisma.contact.findMany({
      where: {
        userId,
        isArchived: false,
        lastMessageAt: {
          not: null,
        },

        // البحث
        ...(search
          ? {
              OR: [
                {
                  name: {
                    contains: search,
                    mode: "insensitive",
                  },
                },
                {
                  phone: {
                    contains: search,
                  },
                },
              ],
            }
          : {}),
      },

      take: limit,

      ...(cursor
        ? {
            skip: 1,
            cursor: {
              id: cursor,
            },
          }
        : {}),

      orderBy: [
        { isPinned: "desc" },
        { lastMessageAt: "desc" },
      ],

      select: {
        id: true,
        name: true,
        phone: true,
        notes: true,
        audienceId: true,

        isPinned: true,
        isArchived: true,
        unreadCount: true,
        lastMessageAt: true,

        messages: {
          take: 1,
          orderBy: {
            createdAt: "desc",
          },
          select: {
            id: true,
            content: true,
            type: true,
            direction: true,
            status: true,
            createdAt: true,
          },
        },

        _count: {
          select: {
            messages: {
              where: {
                direction: "inbound",
                status: {
                  not: "read",
                },
              },
            },
          },
        },
      },
    });

    const conversations = contacts.map((c) => ({
      contact: {
        id: c.id,
        name: c.name,
        phone: c.phone,
        notes: c.notes,
        audienceId: c.audienceId,
      },

      lastMessage: c.messages[0] || null,

      unreadCount: c._count.messages,

      isPinned: c.isPinned,
      isArchived: c.isArchived,
      lastMessageAt: c.lastMessageAt,
    }));

    return NextResponse.json({
      conversations,

      nextCursor:
        contacts.length === limit
          ? contacts[contacts.length - 1].id
          : null,
    });
  } catch (error) {
    console.error("Fetch Conversations Error:", error);

    return NextResponse.json(
      { error: "Failed to fetch conversations" },
      { status: 500 }
    );
  }
}