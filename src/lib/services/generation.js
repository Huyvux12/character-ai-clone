import { prisma } from "../prisma.js";
import { chooseProvider, generateText } from "./llm-providers.js";

export class GenerationService {
  static async run({ chatId, userId, action = "generate", targetMessageId = null,
    model, temperature = 1, maxTokens = 2048, reasoning = false, systemPrompt,
    structuredTurns = [], prompt, imageUrl = null, customApiKey = null }) {
    const provider = chooseProvider({ customApiKey, imageUrl });
    const apiKey = customApiKey || (provider === "openai-compatible" ? process.env.LLM_API_KEY : process.env.MU_API_KEY);
    if (!apiKey) throw Object.assign(new Error("AI provider key is not configured"), { statusCode: 503 });
    const selectedModel = provider === "openai-compatible" ? (process.env.LLM_MODEL || model) : model;
    const run = await prisma.generationRun.create({ data: {
      chatId, targetMessageId, action, status: "running", provider, model: selectedModel,
      cost: 0, settingsSnapshot: JSON.stringify({ temperature, maxTokens, reasoning }), promptSnapshot: prompt,
    } });

    try {
      const result = await generateText({ provider, apiKey, model: selectedModel, systemPrompt,
        structuredTurns, prompt, imageUrl, temperature, maxTokens, reasoning });
      await prisma.generationRun.update({ where: { id: run.id }, data: {
        status: "succeeded", requestId: result.requestId || null,
        usageJson: result.usage ? JSON.stringify(result.usage) : null, completedAt: new Date(),
      } });
      return { text: result.text, generationRunId: run.id };
    } catch (error) {
      await prisma.generationRun.update({ where: { id: run.id }, data: {
        status: "failed", error: String(error.message).slice(0, 500), completedAt: new Date(),
      } });
      throw error;
    }
  }
}
