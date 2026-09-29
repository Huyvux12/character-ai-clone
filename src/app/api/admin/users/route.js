import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth-helpers";

export async function POST(req) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const body = await req.json().catch(() => ({}));
  const { userId, action, plan, reason } = body;
  if (!userId || !["disable", "enable", "set_plan"].includes(action)) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  if ((action === "disable" || action === "set_plan") && (typeof reason !== "string" || reason.trim().length < 3)) {
    return NextResponse.json({ error: "Reason is required" }, { status: 400 });
  }
  if (action === "set_plan" && !["free", "unlimited"].includes(plan)) {
    return NextResponse.json({ error: "Invalid plan" }, { status: 400 });
  }
  const target = await prisma.user.findUnique({ where: { id: userId }, select: { id: true, plan: true } });
  if (!target) return NextResponse.json({ error: "User not found" }, { status: 404 });

  await prisma.$transaction(async (tx) => {
    if (action === "disable") {
      await tx.user.update({ where: { id: userId }, data: { disabledAt: new Date(), disabledReason: reason.trim().slice(0, 300) } });
    } else if (action === "enable") {
      await tx.user.update({ where: { id: userId }, data: { disabledAt: null, disabledReason: null } });
    } else {
      await tx.user.update({
        where: { id: userId },
        data: { plan, planActivatedAt: plan === "unlimited" ? new Date() : null },
      });
    }
    await tx.adminAuditLog.create({
      data: {
        adminUserId: admin.id,
        action,
        targetType: "user",
        targetId: userId,
        reason: typeof reason === "string" ? reason.trim().slice(0, 300) : null,
        metadata: JSON.stringify({ plan: plan || target.plan }),
      },
    });
  });
  return NextResponse.json({ ok: true });
}
