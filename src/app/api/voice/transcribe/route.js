import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth-helpers";
import { AUDIO_TYPES, MAX_AUDIO_BYTES, transcribeAudio } from "@/lib/services/voice";
import { reserveVoiceRequest } from "@/lib/voice-limit";

export async function POST(req) {
  const user = await getAuthenticatedUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!process.env.GROQ_API_KEY) return NextResponse.json({ error: "GROQ_API_KEY is not configured" }, { status: 503 });
  if (Number(req.headers.get("content-length")) > MAX_AUDIO_BYTES + 2000) {
    return NextResponse.json({ error: "Recording exceeds 12 MB" }, { status: 413 });
  }
  try {
    const form = await req.formData();
    const file = form.get("audio");
    const language = form.get("language") || "vi";
    if (!(file instanceof File) || !AUDIO_TYPES.has(file.type.split(";")[0]) || file.size < 100 || file.size > MAX_AUDIO_BYTES || !["vi", "en", "auto"].includes(language)) {
      return NextResponse.json({ error: "Invalid audio file or language" }, { status: 400 });
    }
    await reserveVoiceRequest(user.id, "voice_stt");
    const text = await transcribeAudio({ file, language, apiKey: process.env.GROQ_API_KEY });
    return NextResponse.json({ text });
  } catch (error) {
    console.error("[VOICE_STT_ERROR]", error.message);
    return NextResponse.json({ error: error.message }, { status: error.statusCode || 502 });
  }
}
