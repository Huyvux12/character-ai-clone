const MU_URL = "https://api.muapi.ai/api/v1";

function errorFrom(response, body) {
  const message = body?.error?.message || body?.detail || body?.message || response.statusText;
  const error = new Error(`AI provider error (${response.status}): ${String(message).slice(0, 300)}`);
  error.statusCode = response.status === 429 ? 429 : 502;
  return error;
}

export function chooseProvider({ customApiKey, imageUrl }) {
  if (customApiKey) return "muapi";
  if (process.env.LLM_BASE_URL && process.env.LLM_API_KEY) return "openai-compatible";
  return "muapi";
}

export async function generateText({ provider, apiKey, model, systemPrompt, structuredTurns = [], prompt, imageUrl, temperature, maxTokens, reasoning }) {
  if (provider === "openai-compatible") {
    const base = new URL(process.env.LLM_BASE_URL);
    if (base.protocol !== "https:" && !(base.hostname === "localhost" || base.hostname === "127.0.0.1")) {
      throw new Error("LLM_BASE_URL must use HTTPS (except localhost)");
    }
    const endpoint = new URL(`${base.pathname.replace(/\/$/, "")}/chat/completions`, base);
    const userContent = imageUrl
      ? [{ type: "text", text: prompt }, { type: "image_url", image_url: { url: imageUrl } }]
      : prompt;
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: model || process.env.LLM_MODEL,
        messages: [{ role: "system", content: systemPrompt }, ...structuredTurns.map(({ role, content }) => ({ role, content })), { role: "user", content: userContent }],
        temperature: Number(temperature),
        max_tokens: Number(maxTokens),
        ...(reasoning ? { reasoning_effort: "high" } : {}),
      }),
      signal: AbortSignal.timeout(70000),
    });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) throw errorFrom(response, body);
    const content = body.choices?.[0]?.message?.content;
    const text = typeof content === "string" ? content : Array.isArray(content) ? content.filter((part) => part.type === "text").map((part) => part.text).join("\n") : "";
    if (!text.trim()) throw new Error("AI provider returned an empty response");
    return { text, usage: body.usage || null };
  }

  const response = await fetch(`${MU_URL}/${imageUrl ? "openrouter-vision" : "any-llm-models"}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-api-key": apiKey },
    body: JSON.stringify({ prompt, system_prompt: systemPrompt, model, temperature: Number(temperature), max_tokens: Number(maxTokens), reasoning: Boolean(reasoning), ...(imageUrl ? { images_list: [imageUrl] } : {}) }),
    signal: AbortSignal.timeout(15000),
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw errorFrom(response, body);
  if (!body.request_id) throw new Error("MuAPI did not return a request ID");
  const deadline = Date.now() + 60000;
  while (Date.now() < deadline) {
    await new Promise((resolve) => setTimeout(resolve, 1500));
    const poll = await fetch(`${MU_URL}/predictions/${encodeURIComponent(body.request_id)}/result`, {
      headers: { "x-api-key": apiKey }, signal: AbortSignal.timeout(10000),
    });
    const result = await poll.json().catch(() => ({}));
    if (!poll.ok) throw errorFrom(poll, result);
    const state = (result.status || result.state || "processing").toLowerCase();
    if (["failed", "cancelled"].includes(state)) throw new Error(`MuAPI generation ${state}`);
    if (["completed", "succeeded"].includes(state)) {
      const text = result.outputs?.[0] || result.output?.choices?.[0]?.message?.content || result.output?.text || result.output || result.response;
      if (typeof text !== "string" || !text.trim()) throw new Error("MuAPI returned an empty response");
      return { text, requestId: body.request_id };
    }
  }
  throw new Error("MuAPI generation timed out");
}
