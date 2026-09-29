import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isAdminEmail } from "@/lib/admin-policy";

export async function getAuthenticatedUser() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return null;
  const dbUser = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, name: true, email: true, image: true, plan: true, disabledAt: true, disabledReason: true },
  });
  return dbUser;
}

export function accountBlock(user) {
  if (!user?.disabledAt) return null;
  return NextResponse.json({
    error: "This account is disabled.",
    reason: user.disabledReason || null,
  }, { status: 403 });
}

export async function requireAdmin() {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email;
  if (!email || !isAdminEmail(email)) return null;
  return prisma.user.findUnique({ where: { email }, select: { id: true, email: true, name: true } });
}

/**
 * Retrieves a chat ensuring it belongs to the authenticated user.
 * Prevents IDOR (Insecure Direct Object Reference).
 */
export async function getOwnedChat(userId, chatId) {
  if (!userId || !chatId) {
    return null;
  }

  const chat = await prisma.chat.findFirst({
    where: {
      id: chatId,
      userId: userId,
    },
    include: {
      character: true,
      storySummary: true,
    },
  });

  return chat;
}
