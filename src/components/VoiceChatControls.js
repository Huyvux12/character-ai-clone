"use client";

import { useEffect, useRef, useState } from "react";
import { Mic, Square, Volume2, VolumeX, Loader2 } from "lucide-react";

const MIME_TYPES = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/ogg"];

export default function VoiceChatControls({ chatId, onTranscript, onRecordingChange, disabled }) {
  const [status, setStatus] = useState("idle");
  const [error, setError] = useState("");
  const [transcript, setTranscript] = useState("");
  const [language, setLanguage] = useState("vi");
  const [voice, setVoice] = useState("Kore");
  const recorderRef = useRef(null);
  const streamRef = useRef(null);
  const timerRef = useRef(null);
  const audioRef = useRef(null);
  const audioUrlRef = useRef(null);
  const mountedRef = useRef(true);

  const releaseAudio = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.onended = null;
      audioRef.current = null;
    }
    if (audioUrlRef.current) URL.revokeObjectURL(audioUrlRef.current);
    audioUrlRef.current = null;
  };

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      clearTimeout(timerRef.current);
      if (recorderRef.current?.state === "recording") recorderRef.current.stop();
      streamRef.current?.getTracks().forEach((track) => track.stop());
      releaseAudio();
    };
  }, []);

  async function processRecording(blob) {
    if (!mountedRef.current) return;
    if (blob.size < 100) {
      setStatus("idle");
      setError("No audio was captured. Please try again.");
      return;
    }
    setError("");
    try {
      setStatus("transcribing");
      const type = blob.type.split(";")[0];
      const extension = type === "audio/mp4" ? "m4a" : type === "audio/ogg" ? "ogg" : "webm";
      const form = new FormData();
      form.set("audio", new File([blob], `recording.${extension}`, { type }), `recording.${extension}`);
      form.set("language", language);
      form.set("chatId", chatId);
      const sttResponse = await fetch("/api/voice/transcribe", { method: "POST", body: form });
      const sttData = await sttResponse.json();
      if (!sttResponse.ok) throw new Error(sttData.error || "Transcription failed");
      if (!mountedRef.current) return;
      setTranscript(sttData.text);
      setStatus("thinking");
      const reply = await onTranscript(sttData.text);
      if (!mountedRef.current) return;
      if (!reply) { setStatus("idle"); return; }

      setStatus("synthesizing");
      const ttsResponse = await fetch("/api/voice/speak", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chatId, messageId: reply.id, voice }),
      });
      if (!ttsResponse.ok) {
        const ttsData = await ttsResponse.json().catch(() => ({}));
        throw new Error(ttsData.error || "Speech generation failed");
      }
      const wav = await ttsResponse.blob();
      if (!mountedRef.current) return;
      releaseAudio();
      const url = URL.createObjectURL(wav);
      audioUrlRef.current = url;
      const audio = new Audio(url);
      audioRef.current = audio;
      audio.onended = () => { if (mountedRef.current) setStatus("ready"); };
      setStatus("speaking");
      try { await audio.play(); }
      catch { if (mountedRef.current) setStatus("ready"); }
    } catch (err) {
      if (mountedRef.current) {
        setError(err.message || "Voice chat failed");
        setStatus("idle");
      }
    }
  }

  async function startRecording() {
    releaseAudio();
    setTranscript("");
    setError("");
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
      setError("Microphone recording is not supported in this browser or context.");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } });
      if (!mountedRef.current) { stream.getTracks().forEach((track) => track.stop()); return; }
      streamRef.current = stream;
      const mimeType = MIME_TYPES.find((type) => MediaRecorder.isTypeSupported(type));
      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      recorderRef.current = recorder;
      const chunks = [];
      let failed = false;
      recorder.ondataavailable = (event) => { if (event.data.size > 0) chunks.push(event.data); };
      recorder.onerror = () => { failed = true; setError("Microphone recording failed"); stopRecording(); };
      recorder.onstop = () => {
        onRecordingChange(false);
        clearTimeout(timerRef.current);
        stream.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
        if (mountedRef.current) {
          if (failed) setStatus("idle");
          else processRecording(new Blob(chunks, { type: recorder.mimeType || mimeType || "audio/webm" }));
        }
      };
      recorder.start();
      onRecordingChange(true);
      setStatus("recording");
      timerRef.current = setTimeout(() => recorder.state === "recording" && recorder.stop(), 60000);
    } catch (err) {
      onRecordingChange(false);
      streamRef.current?.getTracks().forEach((track) => track.stop());
      setError(err.name === "NotAllowedError" ? "Allow microphone access to use voice chat." : "Could not start microphone recording.");
      setStatus("idle");
    }
  }

  function stopRecording() {
    if (recorderRef.current?.state === "recording") {
      setStatus("transcribing");
      recorderRef.current.stop();
    }
  }

  function togglePlayback() {
    if (!audioRef.current) return;
    if (audioRef.current.paused) {
      audioRef.current.play().then(() => setStatus("speaking")).catch(() => setError("Browser blocked playback. Tap play again."));
    } else {
      audioRef.current.pause();
      setStatus("ready");
    }
  }

  const busy = ["transcribing", "thinking", "synthesizing"].includes(status);
  const label = { idle: "Tap to speak", recording: "Recording · tap to send", transcribing: "Transcribing…", thinking: "Waiting for reply…", synthesizing: "Creating speech…", speaking: "Speaking…", ready: "Reply ready" }[status];

  return (
    <div className="voice-controls" role="group" aria-label="Voice chat">
      <button type="button" onClick={status === "recording" ? stopRecording : startRecording}
        disabled={status !== "recording" && (busy || disabled)} aria-label={status === "recording" ? "Stop and send recording" : "Start voice chat"}
        title={disabled ? "Finish or clear your text message first" : label}
        className={`voice-mic ${status === "recording" ? "recording" : ""}`}>
        {busy ? <Loader2 size={16} className="animate-spin" /> : status === "recording" ? <Square size={15} /> : <Mic size={17} />}
      </button>
      <div className="voice-meta" aria-live="polite">
        <strong>{label}</strong>
        {error ? <span className="voice-error">{error}</span> : transcript ? <span title={transcript}>You: {transcript}</span> : <span>Groq STT · Gemini TTS</span>}
      </div>
      <select aria-label="Recognition language" value={language} onChange={(e) => setLanguage(e.target.value)} disabled={status === "recording" || busy}>
        <option value="vi">VI</option><option value="en">EN</option><option value="auto">Auto</option>
      </select>
      <select aria-label="Gemini voice" value={voice} onChange={(e) => setVoice(e.target.value)} disabled={status === "recording" || busy}>
        <option value="Kore">Kore</option><option value="Puck">Puck</option>
      </select>
      {audioRef.current && <button type="button" className="voice-play" onClick={togglePlayback} aria-label={status === "speaking" ? "Pause reply audio" : "Play reply audio"}>
        {status === "speaking" ? <VolumeX size={17} /> : <Volume2 size={17} />}
      </button>}
    </div>
  );
}
