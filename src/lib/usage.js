import { prisma } from "./prisma";
import { mergeDailyUsage, recentVnDays, sumTokenUsage, vnDayStart, vnMonthStart } from "./usage-math";

async function dailyMessages(userId, since) {
  const rows = await prisma.$queryRaw`
    SELECT to_char(m."createdAt" AT TIME ZONE 'Asia/Ho_Chi_Minh', 'YYYY-MM-DD') AS day,
           COUNT(*)::int AS count
    FROM "Message" m
    INNER JOIN "Chat" c ON c.id = m."chatId"
    WHERE c."userId" = ${userId}
      AND m.role = 'user'
      AND m."createdAt" >= ${since}
    GROUP BY 1
    ORDER BY 1
  `;
  return rows.map((row) => ({ day: row.day, count: Number(row.count) }));
}

async function dailyVoice(userId, since) {
  const rows = await prisma.$queryRaw`
    SELECT to_char("createdAt" AT TIME ZONE 'Asia/Ho_Chi_Minh', 'YYYY-MM-DD') AS day,
           type,
           COUNT(*)::int AS count
    FROM "VoiceRequest"
    WHERE "userId" = ${userId}
      AND status = 'succeeded'
      AND "createdAt" >= ${since}
    GROUP BY 1, 2
    ORDER BY 1
  `;
  return rows.map((row) => ({ day: row.day, type: row.type, count: Number(row.count) }));
}

export async function getUserUsage(userId) {
  const monthStart = vnMonthStart();
  const chartStart = new Date(vnDayStart().getTime() - 13 * 86400000);
  const chatWhere = { chat: { userId } };
  const [userMessages, assistantMessages, voiceGroups, usageRows, messageDays, voiceDays, allMessages, allVoice] = await Promise.all([
    prisma.message.count({ where: { ...chatWhere, role: "user", createdAt: { gte: monthStart } } }),
    prisma.message.count({ where: { ...chatWhere, role: "assistant", createdAt: { gte: monthStart } } }),
    prisma.voiceRequest.groupBy({
      by: ["type", "status"],
      where: { userId, createdAt: { gte: monthStart } },
      _count: { _all: true },
    }),
    prisma.generationRun.findMany({
      where: { chat: { userId }, status: "succeeded", createdAt: { gte: monthStart } },
      select: { usageJson: true },
    }),
    dailyMessages(userId, chartStart),
    dailyVoice(userId, chartStart),
    prisma.message.count({ where: { ...chatWhere, role: "user" } }),
    prisma.voiceRequest.count({ where: { userId, status: "succeeded" } }),
  ]);

  const voice = { stt: 0, tts: 0, failed: 0 };
  for (const group of voiceGroups) {
    const count = group._count._all;
    if (group.status === "failed") voice.failed += count;
    if (group.status === "succeeded" && (group.type === "stt" || group.type === "tts")) voice[group.type] += count;
  }

  return {
    monthStart,
    messages: userMessages,
    replies: assistantMessages,
    voice,
    tokens: sumTokenUsage(usageRows),
    days: mergeDailyUsage(recentVnDays(14), messageDays, voiceDays),
    allTime: { messages: allMessages, voice: allVoice },
  };
}

export async function getUsageOverview() {
  const monthStart = vnMonthStart();
  const dayStart = vnDayStart();
  const sinceDayAgo = new Date(Date.now() - 86400000);
  const [users, unlimited, paidToday, failedGenerations, failedVoice, monthMessages, monthVoice, recentAudits] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { plan: "unlimited" } }),
    prisma.paymentOrder.aggregate({
      where: { status: "paid", paidAt: { gte: dayStart } },
      _sum: { amountVnd: true },
      _count: { _all: true },
    }),
    prisma.generationRun.count({ where: { status: "failed", createdAt: { gte: sinceDayAgo } } }),
    prisma.voiceRequest.count({ where: { status: "failed", createdAt: { gte: sinceDayAgo } } }),
    prisma.message.count({ where: { role: "user", createdAt: { gte: monthStart } } }),
    prisma.voiceRequest.count({ where: { status: "succeeded", createdAt: { gte: monthStart } } }),
    prisma.adminAuditLog.findMany({
      orderBy: { createdAt: "desc" },
      take: 10,
      include: { admin: { select: { email: true } } },
    }),
  ]);
  return {
    users,
    unlimited,
    free: users - unlimited,
    paidTodayCount: paidToday._count._all,
    paidTodayVnd: paidToday._sum.amountVnd || 0,
    failedGenerations,
    failedVoice,
    monthMessages,
    monthVoice,
    recentAudits,
  };
}
