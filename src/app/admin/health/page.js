import { prisma } from "@/lib/prisma";
import { formatWhen } from "@/lib/usage-math";

export const dynamic = "force-dynamic";

export default async function AdminHealthPage() {
  let generations = [];
  let voice = [];
  let error = "";
  try {
    [generations, voice] = await Promise.all([
      prisma.generationRun.findMany({
        where: { status: "failed" },
        orderBy: { createdAt: "desc" },
        take: 30,
        select: {
          id: true, model: true, provider: true, error: true, createdAt: true,
          chat: { select: { user: { select: { email: true } }, character: { select: { name: true } } } },
        },
      }),
      prisma.voiceRequest.findMany({
        where: { status: "failed" },
        orderBy: { createdAt: "desc" },
        take: 30,
        select: { id: true, type: true, error: true, createdAt: true, user: { select: { email: true } } },
      }),
    ]);
  } catch (err) {
    error = err.message;
  }
  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-black">Lỗi hệ thống</h1>
      {error && <p className="text-sm text-red-400">{error}</p>}
      <section>
        <h2 className="font-black">Chat LLM</h2>
        <ul className="mt-3 space-y-2 text-sm">
          {generations.length === 0 && <li className="text-secondary-text">Không có lỗi generation gần đây.</li>}
          {generations.map((run) => (
            <li key={run.id} className="rounded-xl border border-divider/40 px-3 py-2">
              <p className="font-bold">{run.chat?.character?.name || "Nhân vật"} · {run.provider}/{run.model}</p>
              <p className="text-xs text-secondary-text">{run.chat?.user?.email} · {formatWhen(run.createdAt)}</p>
              <p className="text-xs">{run.error}</p>
            </li>
          ))}
        </ul>
      </section>
      <section>
        <h2 className="font-black">Voice</h2>
        <ul className="mt-3 space-y-2 text-sm">
          {voice.length === 0 && <li className="text-secondary-text">Không có lỗi voice gần đây.</li>}
          {voice.map((item) => (
            <li key={item.id} className="rounded-xl border border-divider/40 px-3 py-2">
              <p className="font-bold">{item.type === "stt" ? "Nói" : "Nghe"} · {item.user?.email}</p>
              <p className="text-xs text-secondary-text">{formatWhen(item.createdAt)}</p>
              <p className="text-xs">{item.error}</p>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
