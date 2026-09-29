import { prisma } from "../prisma.js";
import { chooseProvider, generateText } from "./llm-providers.js";

export class GenerationService {
  static async run({ chatId, userId, action = "generate", targetMessageId = null,
    model, temperature = 1, maxTokens = 2048, reasoning = false, systemPrompt,
    structuredTurns = [], prompt, imageUrl = null, cost = 2, customApiKey = null }) {
    const provider = chooseProvider({ customApiKey, imageUrl });
    const apiKey = customApiKey || (provider === "openai-compatible" ? process.env.LLM_API_KEY : process.env.MU_API_KEY);
    if (!apiKey) throw Object.assign(new Error("AI provider key is not configured"), { statusCode: 503 });
    const selectedModel = provider === "openai-compatible" ? (process.env.LLM_MODEL || model) : model;
    const charge = customApiKey ? 0 : cost;
    let run;
    let ledger;
    await prisma.$transaction(async (tx) => {
      if (charge > 0) {
        const reserved = await tx.user.updateMany({ where: { id: userId, credits: { gte: charge } }, data: { credits: { decrement: charge } } });
        if (reserved.count !== 1) throw Object.assign(new Error("Insufficient credits"), { statusCode: 402 });
      }
      run = await tx.generationRun.create({ data: {
        chatId, targetMessageId, action, status: "running", provider, model: selectedModel,
        cost: charge, settingsSnapshot: JSON.stringify({ temperature, maxTokens, reasoning }), promptSnapshot: prompt,
      } });
      if (charge > 0) ledger = await tx.creditLedgerEntry.create({ data: {
        userId, generationRunId: run.id, amount: -charge, type: "generation_charge",
        status: "reserved", idempotencyKey: `charge_${run.id}`,
      } });
    });

    try {
      const result = await generateText({ provider, apiKey, model: selectedModel, systemPrompt,
        structuredTurns, prompt, imageUrl, temperature, maxTokens, reasoning });
      await prisma.$transaction(async (tx) => {
        await tx.generationRun.update({ where: { id: run.id }, data: {
          status: "succeeded", requestId: result.requestId || null,
          usageJson: result.usage ? JSON.stringify(result.usage) : null, completedAt: new Date(),
        } });
        if (ledger) await tx.creditLedgerEntry.update({ where: { id: ledger.id }, data: { status: "settled" } });
      });
      const user = await prisma.user.findUnique({ where: { id: userId }, select: { credits: true } }).catch(() => null);
      return { text: result.text, generationRunId: run.id, remainingCredits: customApiKey ? "∞" : user?.credits ?? 0 };
    } catch (error) {
      // The conditional update makes refunds safe even if the catch path is retried.
      await prisma.$transaction(async (tx) => {
        if (ledger) {
          const changed = await tx.creditLedgerEntry.updateMany({ where: { id: ledger.id, status: "reserved" }, data: { status: "refunded" } });
          if (changed.count) {
            await tx.user.update({ where: { id: userId }, data: { credits: { increment: charge } } });
            await tx.creditLedgerEntry.create({ data: {
              userId, generationRunId: run.id, amount: charge, type: "generation_refund",
              idempotencyKey: `refund_${run.id}`,
            } });
          }
        }
        await tx.generationRun.update({ where: { id: run.id }, data: {
          status: "failed", error: String(error.message).slice(0, 500), completedAt: new Date(),
        } });
      });
      throw error;
    }
  }
}
