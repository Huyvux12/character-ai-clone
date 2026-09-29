import { prisma } from "./prisma";

const WINDOW_MS = 60_000;
const MAX_PER_MINUTE = 10;

export async function beginVoiceRequest(userId, type, chatId = null) {
  const recent = await prisma.voiceRequest.count({ where: {
    userId, type, createdAt: { gte: new Date(Date.now() - WINDOW_MS) },
  } });
  if (recent >= MAX_PER_MINUTE) {
    const error = new Error("Voice limit reached. Try again in a minute.");
    error.statusCode = 429;
    throw error;
  }
  return prisma.voiceRequest.create({
    data: { userId, chatId, type, status: "started" },
    select: { id: true },
  });
}

export async function finishVoiceRequest(id, status, error) {
  if (!id) return;
  await prisma.voiceRequest.update({
    where: { id },
    data: { status, error: error ? String(error).slice(0, 500) : null },
  });
}
