export const VOICE_OPTIONS = ["Kore", "Puck"];
export const AUDIO_TYPES = new Set(["audio/webm", "audio/ogg", "audio/mp4", "audio/mpeg", "audio/wav", "audio/x-wav"]);
export const MAX_AUDIO_BYTES = 12 * 1024 * 1024;

export async function transcribeAudio({ file, apiKey, language = "vi" }) {
  const form = new FormData();
  form.set("file", file, file.name || "recording.webm");
  form.set("model", process.env.GROQ_STT_MODEL || "whisper-large-v3-turbo");
  form.set("response_format", "json");
  if (language !== "auto") form.set("language", language);
  const response = await fetch("https://api.groq.com/openai/v1/audio/transcriptions", {
    method: "POST", headers: { Authorization: `Bearer ${apiKey}` }, body: form,
    signal: AbortSignal.timeout(45000),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(`Groq STT failed (${response.status}): ${String(data.error?.message || response.statusText).slice(0, 180)}`);
  const text = data.text?.trim();
  if (!text) throw new Error("No speech was detected. Try recording again.");
  return text.slice(0, 12000);
}

export async function synthesizeSpeech({ text, voice = "Kore", apiKey }) {
  const model = process.env.GEMINI_TTS_MODEL || "gemini-3.8-flash-lite-tts";
  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`, {
    method: "POST", headers: { "x-goog-api-key": apiKey, "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ role: "user", parts: [{ text }] }],
      generationConfig: {
        responseModalities: ["AUDIO"],
        responseFormat: { audio: { mimeType: "AUDIO_WAV" } },
        speechConfig: { voiceConfig: { voice } },
      },
    }),
    signal: AbortSignal.timeout(60000),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(`Gemini TTS failed (${response.status}): ${String(data.error?.message || response.statusText).slice(0, 180)}`);
  const audioPart = data.candidates?.[0]?.content?.parts?.find((part) => part.inlineData?.data);
  if (!audioPart) throw new Error("Gemini TTS returned no audio");
  const bytes = Buffer.from(audioPart.inlineData.data, "base64");
  // The configured 3.8 unary TTS endpoint returns a complete WAV container.
  if (bytes.length < 44 || bytes.toString("ascii", 0, 4) !== "RIFF" || bytes.toString("ascii", 8, 12) !== "WAVE") {
    throw new Error("Gemini TTS returned an unsupported audio format; select a Gemini 3.8 TTS model");
  }
  return bytes;
}
