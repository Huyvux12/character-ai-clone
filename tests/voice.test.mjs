import test from 'node:test';
import assert from 'node:assert/strict';
import { transcribeAudio, synthesizeSpeech } from '../src/lib/services/voice.js';

test('Groq STT forwards the recorded file and Vietnamese language without exposing key in URL', async (t) => {
  const prior = globalThis.fetch;
  t.after(() => { globalThis.fetch = prior; });
  globalThis.fetch = async (url, options) => {
    assert.equal(url, 'https://api.groq.com/openai/v1/audio/transcriptions');
    assert.equal(options.headers.Authorization, 'Bearer groq_test_secret');
    assert.equal(options.body.get('model'), 'whisper-large-v3-turbo');
    assert.equal(options.body.get('language'), 'vi');
    assert.equal(options.body.get('file').name, 'sample.webm');
    return new Response(JSON.stringify({ text: 'Xin chào! ' }), { status: 200 });
  };
  const file = new File([new Uint8Array(200)], 'sample.webm', { type: 'audio/webm' });
  assert.equal(await transcribeAudio({ file, apiKey: 'groq_test_secret' }), 'Xin chào!');
});

test('Gemini TTS sends single-speaker audio request and accepts WAV bytes', async (t) => {
  const prior = globalThis.fetch;
  t.after(() => { globalThis.fetch = prior; });
  const wav = Buffer.alloc(44);
  wav.write('RIFF', 0); wav.write('WAVE', 8);
  globalThis.fetch = async (url, options) => {
    assert.match(url, /gemini-3\.8-flash-lite-tts:generateContent$/);
    assert.equal(options.headers['x-goog-api-key'], 'gemini_test_secret');
    const request = JSON.parse(options.body);
    assert.equal(request.contents[0].parts[0].text, 'Chào bạn');
    assert.equal(request.generationConfig.responseFormat.audio.mimeType, 'AUDIO_WAV');
    assert.equal(request.generationConfig.speechConfig.voiceConfig.voice, 'Kore');
    return new Response(JSON.stringify({ candidates: [{ content: { parts: [{ inlineData: { mimeType: 'audio/wav', data: wav.toString('base64') } }] } }] }), { status: 200 });
  };
  assert.deepEqual(await synthesizeSpeech({ text: 'Chào bạn', apiKey: 'gemini_test_secret' }), wav);
});

test('Gemini TTS rejects audio responses without a WAV container', async (t) => {
  const prior = globalThis.fetch;
  t.after(() => { globalThis.fetch = prior; });
  globalThis.fetch = async () => new Response(JSON.stringify({ candidates: [{ content: { parts: [{ inlineData: { data: Buffer.alloc(44).toString('base64') } }] } }] }), { status: 200 });
  await assert.rejects(synthesizeSpeech({ text: 'Test', apiKey: 'key' }), /unsupported audio format/);
});
