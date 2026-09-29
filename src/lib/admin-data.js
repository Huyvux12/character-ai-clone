import { Prisma } from "@prisma/client";
import { prisma } from "./prisma";
import { vnMonthStart } from "./usage-math";

export async function searchUsers(query) {
  const monthStart = vnMonthStart();
  const term = String(query || "").trim().slice(0, 80);
  const filter = term
    ? Prisma.sql`WHERE COALESCE(u.email, '') ILIKE ${`%${term}%`} OR COALESCE(u.name, '') ILIKE ${`%${term}%`}`
    : Prisma.empty;
  const rows = await prisma.$queryRaw`
    SELECT u.id, u.name, u.email, u.plan, u."disabledAt", u."disabledReason",
           COALESCE(m.messages, 0)::int AS messages,
           COALESCE(v.voice, 0)::int AS voice
    FROM "User" u
    LEFT JOIN (
      SELECT c."userId" AS user_id, COUNT(*) AS messages
      FROM "Message" msg
      JOIN "Chat" c ON c.id = msg."chatId"
      WHERE msg.role = 'user' AND msg."createdAt" >= ${monthStart}
      GROUP BY c."userId"
    ) m ON m.user_id = u.id
    LEFT JOIN (
      SELECT "userId" AS user_id, COUNT(*) AS voice
      FROM "VoiceRequest"
      WHERE status = 'succeeded' AND "createdAt" >= ${monthStart}
      GROUP BY "userId"
    ) v ON v.user_id = u.id
    ${filter}
    ORDER BY messages DESC, u.email ASC
    LIMIT 80
  `;
  return rows.map((row) => ({
    ...row,
    messages: Number(row.messages) || 0,
    voice: Number(row.voice) || 0,
    disabledAt: row.disabledAt ? new Date(row.disabledAt).toISOString() : null,
  }));
}
