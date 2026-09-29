import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth-helpers";
import { synthesizeSpeech, VOICE_OPTIONS } from "@/lib/services/voice";
import { prisma } from "@/lib/prisma";
import { getOwnedChat } from "@/lib/auth-helpers";
import { reserveVoiceRequest } from "@/lib/voice-limit";

export async function POST(req) {
  const user = await getAuthenticatedUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!process.env.GEMINI_API_KEY) return NextResponse.json({ error: "GEMINI_API_KEY is not configured" }, { status: 503 });
  try {
    const { chatId, messageId, voice = "Kore" } = await req.json();
    if (typeof chatId !== "string" || typeof messageId !== "string" || !VOICE_OPTIONS.includes(voice)) {
      return NextResponse.json({ error: "Invalid message or voice" }, { status: 400 });
    }
    const chat = await getOwnedChat(user.id, chatId);
    if (!chat) return NextResponse.json({ error: "Chat not found" }, { status: 404 });
    const message = await prisma.message.findFirst({ where: { id: messageId, chatId, role: "assistant" }, select: { content: true } });
    if (!message) return NextResponse.json({ error: "Assistant reply not found" }, { status: 404 });
    const text = message.content.replace(/```[\s\S]*?```/g, " ").replace(/[*#`_]/g, "").trim().slice(0, 3000);
    if (!text) return NextResponse.json({ error: "Nothing to speak" }, { status: 400 });
    await reserveVoiceRequest(user.id, "voice_tts");
    const bytes = await synthesizeSpeech({ text, voice, apiKey: process.env.GEMINI_API_KEY });
    return new Response(bytes, { headers: {
      "Content-Type": "audio/wav", "Cache-Control": "private, no-store", "Content-Length": String(bytes.length),
    } });
  } catch (error) {
    console.error("[VOICE_TTS_ERROR]", error.message);
    return NextResponse.json({ error: error.message }, { status: error.statusCode || 502 });
  }
}
