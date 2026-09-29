import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth-helpers";

export async function POST(req) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const body = await req.json().catch(() => ({}));
  const { characterId, action, note } = body;
  if (!characterId || !["hide", "show", "delete"].includes(action)) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  const character = await prisma.character.findUnique({ where: { id: characterId }, select: { id: true, isCustom: true, name: true } });
  if (!character) return NextResponse.json({ error: "Character not found" }, { status: 404 });
  if (action === "delete" && !character.isCustom) {
    return NextResponse.json({ error: "Default characters can be hidden, not deleted." }, { status: 400 });
  }
  const moderationNote = typeof note === "string" ? note.trim().slice(0, 300) : null;

  await prisma.$transaction(async (tx) => {
    if (action === "delete") {
      await tx.character.delete({ where: { id: characterId } });
    } else {
      await tx.character.update({
        where: { id: characterId },
        data: { moderationStatus: action === "hide" ? "hidden" : "visible", moderationNote },
      });
    }
    await tx.adminAuditLog.create({
      data: {
        adminUserId: admin.id,
        action: action === "delete" ? "delete_character" : action === "hide" ? "hide_character" : "show_character",
        targetType: "character",
        targetId: characterId,
        reason: moderationNote,
        metadata: JSON.stringify({ name: character.name }),
      },
    });
  });
  return NextResponse.json({ ok: true });
}
