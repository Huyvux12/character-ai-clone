import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { encryptApiKey, keyIdentity } from "@/lib/api-key";

export async function POST(req) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const apiKey = body.apiKey ? String(body.apiKey).trim() : null;
    if (!apiKey || apiKey.length < 5 || apiKey.length > 2048) {
      return NextResponse.json({ error: "Invalid API key" }, { status: 400 });
    }

    await prisma.user.update({
      where: { id: session.user.id },
      data: {
        customApiKey: encryptApiKey(apiKey),
        ...(session.user.isApiKeyUser ? { email: `apikey_${keyIdentity(apiKey)}@muapi.local` } : {}),
      },
      select: { id: true }
    });

    return NextResponse.json({
      success: true,
      hasCustomApiKey: true,
    });
  } catch (error) {
    console.error("Error updating custom API key:", error);
    return NextResponse.json({ error: error.message || "Failed to update API key" }, { status: 500 });
  }
}

export async function DELETE(req) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (session.user.isApiKeyUser) {
      return NextResponse.json({ error: "Replace your sign-in key instead of removing it" }, { status: 400 });
    }

    await prisma.user.update({
      where: { id: session.user.id },
      data: { customApiKey: null }
    });

    return NextResponse.json({ success: true, hasCustomApiKey: false });
  } catch (error) {
    console.error("Error clearing custom API key:", error);
    return NextResponse.json({ error: error.message || "Failed to remove API key" }, { status: 500 });
  }
}
