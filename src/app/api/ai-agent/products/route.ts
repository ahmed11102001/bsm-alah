// src/app/api/ai-agent/products/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { checkFeature, guardResponse } from "@/lib/plan-guard";
import { buildSearchText, upsertManualProduct, type ManualProductInput } from "@/lib/product-sync";

async function resolveUserId(session: any): Promise<string | null> {
  const directId = session?.user?.id;
  if (typeof directId === "string" && directId.trim()) return directId;
  const email = session?.user?.email;
  if (typeof email !== "string" || !email.trim()) return null;
  const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() }, select: { id: true } });
  return user?.id ?? null;
}

// ── GET — جيب المنتجات (paginated) ──
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = await resolveUserId(session);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
  const pageSize = Math.min(100, Math.max(1, parseInt(searchParams.get("pageSize") || "50", 10)));
  const source = searchParams.get("source") || undefined;
  const search = searchParams.get("search") || undefined;

  const where: any = { userId, isActive: true };
  if (source) where.source = source;
  if (search) where.searchText = { contains: search.toLowerCase(), mode: "insensitive" };

  const [products, total] = await Promise.all([
    prisma.product.findMany({
      where,
      orderBy: { updatedAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: {
        id: true, source: true, externalId: true,
        name: true, description: true,
        price: true, compareAtPrice: true, currency: true,
        images: true, stock: true, category: true, tags: true,
        url: true, isActive: true,
        relatedProductIds: true,
        aiNotes: true, aiKeywords: true, aiSalesInstructions: true,
        lastSyncedAt: true, updatedAt: true,
      },
    }),
    prisma.product.count({ where }),
  ]);

  // Last sync info
  const lastSync = await prisma.productSyncLog.findFirst({
    where: { userId },
    orderBy: { startedAt: "desc" },
    select: { source: true, status: true, productsSynced: true, errorsCount: true, startedAt: true, completedAt: true },
  });

  return NextResponse.json({
    products,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
    lastSync,
  });
}

// ── POST — أضف منتج يدوي ──
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = await resolveUserId(session);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const guard = await checkFeature(userId, "aiAgent");
  const blocked = guardResponse(guard);
  if (blocked) return blocked;

  const body = await req.json();

  if (!body.name?.trim()) {
    return NextResponse.json({ error: "name is required" }, { status: 400 });
  }

  const input: ManualProductInput = {
    name: body.name.trim(),
    description: body.description || null,
    price: body.price != null ? parseFloat(body.price) : null,
    compareAtPrice: body.compareAtPrice != null ? parseFloat(body.compareAtPrice) : null,
    currency: body.currency || "EGP",
    images: Array.isArray(body.images) ? body.images : [],
    stock: body.stock != null ? parseInt(body.stock, 10) : null,
    category: body.category || null,
    tags: Array.isArray(body.tags) ? body.tags : [],
    url: body.url || null,
    aiNotes: body.aiNotes ?? null,
    aiKeywords: Array.isArray(body.aiKeywords) ? body.aiKeywords : [],
    aiSalesInstructions: body.aiSalesInstructions ?? null,
  };

  const product = await upsertManualProduct(userId, input);
  return NextResponse.json(product, { status: 201 });
}

// ── PATCH — عدّل AI Overlay لمنتج (المتجر المتصل أو اليدوي) ──
export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = await resolveUserId(session);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const guard = await checkFeature(userId, "aiAgent");
  const blocked = guardResponse(guard);
  if (blocked) return blocked;

  const body = await req.json().catch(() => ({}));
  const id = typeof body.id === "string" ? body.id.trim() : "";
  if (!id) return NextResponse.json({ error: "id is required" }, { status: 400 });

  const product = await prisma.product.findFirst({
    where: { id, userId },
    select: { id: true, name: true, description: true, tags: true, category: true, aiNotes: true, aiKeywords: true },
  });
  if (!product) return NextResponse.json({ error: "Product not found" }, { status: 404 });

  const data: {
    aiNotes?: string | null;
    aiKeywords?: string[];
    aiSalesInstructions?: string | null;
    searchText?: string;
  } = {};
  if (Object.prototype.hasOwnProperty.call(body, "aiNotes")) {
    if (body.aiNotes !== null && typeof body.aiNotes !== "string") return NextResponse.json({ error: "aiNotes must be a string or null" }, { status: 400 });
    data.aiNotes = body.aiNotes;
  }
  if (Object.prototype.hasOwnProperty.call(body, "aiKeywords")) {
    if (!Array.isArray(body.aiKeywords) || body.aiKeywords.some((keyword: unknown) => typeof keyword !== "string")) {
      return NextResponse.json({ error: "aiKeywords must be an array of strings" }, { status: 400 });
    }
    data.aiKeywords = body.aiKeywords;
  }
  if (Object.prototype.hasOwnProperty.call(body, "aiSalesInstructions")) {
    if (body.aiSalesInstructions !== null && typeof body.aiSalesInstructions !== "string") return NextResponse.json({ error: "aiSalesInstructions must be a string or null" }, { status: 400 });
    data.aiSalesInstructions = body.aiSalesInstructions;
  }
  if (!Object.keys(data).length) return NextResponse.json({ error: "At least one AI overlay field is required" }, { status: 400 });

  data.searchText = buildSearchText({
    name: product.name,
    description: product.description,
    tags: product.tags,
    category: product.category,
    aiNotes: data.aiNotes ?? product.aiNotes,
    aiKeywords: data.aiKeywords ?? product.aiKeywords,
  });

  const updated = await prisma.product.update({ where: { id }, data });
  return NextResponse.json(updated);
}

// ── DELETE — احذف منتج (soft delete: isActive=false) ──
export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = await resolveUserId(session);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id is required" }, { status: 400 });

  await prisma.product.updateMany({
    where: { id, userId },
    data: { isActive: false },
  });

  return NextResponse.json({ success: true });
}
