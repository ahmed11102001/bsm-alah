import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET(req) {
  const latestMessages = await prisma.message.findMany({
    where: { direction: "inbound" },
    orderBy: { createdAt: "desc" },
    take: 10,
    include: { contact: true }
  });
  
  const totalInbound = await prisma.message.count({ where: { direction: "inbound" } });
  const totalOutbound = await prisma.message.count({ where: { direction: "outbound" } });
  
  const latestContacts = await prisma.contact.findMany({
    orderBy: { createdAt: "desc" },
    take: 10,
    include: { _count: { select: { messages: true } } }
  });
  
  return NextResponse.json({ 
    totalInbound, 
    totalOutbound, 
    latestMessages, 
    latestContacts 
  });
}
