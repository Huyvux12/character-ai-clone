import { randomUUID } from "node:crypto";
import { prisma } from "./prisma";

export async function reserveVoiceRequest(userId, type) {
  const recent = await prisma.creditLedgerEntry.count({ where: {
    userId, type, createdAt: { gte: new Date(Date.now() - 60_000) },
  } });
  if (recent >= 10) {
    const error = new Error("Voice limit reached. Try again in a minute.");
    error.statusCode = 429;
    throw error;
  }
  await prisma.creditLedgerEntry.create({ data: {
    userId, type, amount: 0, status: "settled", idempotencyKey: `voice_${randomUUID()}`,
  } });
}
