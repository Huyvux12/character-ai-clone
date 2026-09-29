import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import SiteFrame from "@/components/SiteFrame";
import { prisma } from "@/lib/prisma";
import { getUserUsage } from "@/lib/usage";
import { formatWhen } from "@/lib/usage-math";

export const dynamic = "force-dynamic";

function Card({ label, value, note }) {
  return (
    <article className="rounded-2xl border border-divider/50 bg-bg-card p-4">
      <p className="text-[11px] font-bold uppercase tracking-wider text-secondary-text">{label}</p>
      <p className="mt-2 text-3xl font-black">{value}</p>
      {note && <p className="mt-1 text-[11px] text-secondary-text">{note}</p>}
    </article>
  );
}

export default async function UsagePage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/login?callbackUrl=/usage");
  let usage;
  let plan = "Free";
  try {
    const [usageResult, user] = await Promise.all([
      getUserUsage(session.user.id),
      prisma.user.findUnique({ where: { id: session.user.id }, select: { plan: true } }),
    ]);
    usage = usageResult;
    plan = user?.plan === "unlimited" ? "Unlimited" : "Free";
  } catch (error) {
    return (
      <SiteFrame>
        <p className="mx-auto max-w-3xl px-4 py-16 text-sm text-secondary-text">Chưa đọc được usage. Kiểm tra database đã có bảng VoiceRequest. {error.message}</p>
      </SiteFrame>
    );
  }
  const peak = Math.max(1, ...usage.days.map((day) => day.messages + day.stt + day.tts));

  return (
    <SiteFrame>
      <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.2em] text-primary">Usage của bạn</p>
            <h1 className="mt-2 text-3xl font-black">Tháng này · {plan}</h1>
            <p className="mt-2 text-sm text-secondary-text">Kỳ tính từ {formatWhen(usage.monthStart)}, giờ Việt Nam. Không trừ credit theo lượt.</p>
          </div>
          {plan === "Free" && <Link href="/pricing" className="rounded-full bg-primary px-4 py-2 text-xs font-black text-white">Xem gói Unlimited</Link>}
        </div>
        <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Card label="Tin bạn gửi" value={usage.messages} note={`Tổng từ trước tới nay: ${usage.allTime.messages}`} />
          <Card label="Câu nhân vật trả lời" value={usage.replies} />
          <Card label="Lượt nói" value={usage.voice.stt} note="Nhận dạng giọng nói thành công" />
          <Card label="Lượt nghe" value={usage.voice.tts} note={`Lỗi voice trong tháng: ${usage.voice.failed}`} />
        </div>
        <article className="mt-4 rounded-2xl border border-divider/50 bg-bg-card p-4">
          <p className="text-[11px] font-bold uppercase tracking-wider text-secondary-text">Token model trong tháng</p>
          <p className="mt-2 text-2xl font-black">{usage.tokens.total.toLocaleString("vi-VN")}</p>
          <p className="mt-1 text-[11px] text-secondary-text">Đầu vào {usage.tokens.prompt.toLocaleString("vi-VN")} · đầu ra {usage.tokens.completion.toLocaleString("vi-VN")}. Một số model không trả token, khi đó ô này giữ ở 0 dù chat vẫn được đếm.</p>
        </article>
        <section className="mt-8">
          <h2 className="text-lg font-black">14 ngày gần nhất</h2>
          <div className="mt-4 space-y-2">
            {usage.days.map((day) => (
              <div key={day.day} className="grid grid-cols-[92px_1fr_auto] items-center gap-3 text-xs">
                <span className="text-secondary-text">{day.day.slice(5)}</span>
                <div className="h-2 rounded-full bg-bg-card overflow-hidden">
                  <div className="h-full bg-primary" style={{ width: `${((day.messages + day.stt + day.tts) / peak) * 100}%` }} />
                </div>
                <span className="text-secondary-text">{day.messages} tin · {day.stt} nói · {day.tts} nghe</span>
              </div>
            ))}
          </div>
        </section>
      </div>
    </SiteFrame>
  );
}
