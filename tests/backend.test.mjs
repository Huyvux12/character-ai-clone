import test from 'node:test';
import assert from 'node:assert/strict';
import { encryptApiKey, decryptApiKey, keyIdentity } from '../src/lib/api-key.js';
import { generateText } from '../src/lib/services/llm-providers.js';

process.env.API_KEY_ENCRYPTION_KEY = 'test_only_secret_with_more_than_32_characters';

test('API key encryption is authenticated and never stores plaintext', () => {
  const raw = 'mu_example_private_key_123';
  const stored = encryptApiKey(raw);
  assert.ok(stored.startsWith('enc:v1:'));
  assert.ok(!stored.includes(raw));
  assert.equal(decryptApiKey(stored), raw);
  assert.equal(keyIdentity(raw), keyIdentity(raw));
  assert.notEqual(keyIdentity(raw), keyIdentity(raw + 'x'));
  assert.throws(() => decryptApiKey(stored.slice(0, -2) + 'ab'));
});

test('OpenAI-compatible adapter sends bounded structured history and parses response', async (t) => {
  process.env.LLM_BASE_URL = 'https://example.invalid/v1';
  const oldFetch = globalThis.fetch;
  t.after(() => { globalThis.fetch = oldFetch; });
  globalThis.fetch = async (url, options) => {
    assert.equal(url.toString(), 'https://example.invalid/v1/chat/completions');
    assert.equal(options.headers.Authorization, 'Bearer secret');
    const body = JSON.parse(options.body);
    assert.deepEqual(body.messages.map((m) => m.role), ['system', 'assistant', 'user', 'user']);
    assert.equal(body.messages[1].content, 'Earlier response');
    assert.equal(body.messages[3].content, 'Hello');
    return new Response(JSON.stringify({ choices: [{ message: { content: 'Hi there' } }], usage: { total_tokens: 22 } }), { status: 200 });
  };
  const result = await generateText({ provider: 'openai-compatible', apiKey: 'secret', model: 'test', systemPrompt: 'Stay in character', structuredTurns: [{ role: 'assistant', content: 'Earlier response' }, { role: 'user', content: 'Earlier question' }], prompt: 'Hello', temperature: 1, maxTokens: 50 });
  assert.equal(result.text, 'Hi there');
  assert.equal(result.usage.total_tokens, 22);
});

test('OpenAI-compatible adapter rejects insecure remote URL before sending credentials', async () => {
  process.env.LLM_BASE_URL = 'http://example.invalid/v1';
  await assert.rejects(generateText({ provider: 'openai-compatible', apiKey: 'secret', prompt: 'Hello' }), /HTTPS/);
});
